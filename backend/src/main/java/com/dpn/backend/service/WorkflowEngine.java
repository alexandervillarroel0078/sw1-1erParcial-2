package com.dpn.backend.service;

import com.dpn.backend.dto.AvanzarFlujoResult;
import com.dpn.backend.dto.OpcionDecisionDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.model.Departamento;
import com.dpn.backend.model.Politica;
import com.dpn.backend.model.Tarea;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.model.embedded.AristaPolitica;
import com.dpn.backend.model.embedded.NodoPolitica;
import com.dpn.backend.model.enums.EstadoTarea;
import com.dpn.backend.model.enums.EstadoTramite;
import com.dpn.backend.model.enums.TipoNodo;
import com.dpn.backend.repository.DepartamentoRepository;
import com.dpn.backend.repository.PoliticaRepository;
import com.dpn.backend.repository.TareaRepository;
import com.dpn.backend.repository.TramiteRepository;
import com.dpn.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkflowEngine {

	/**
	 * {@code true} mientras se expande el flujo tras {@link #continuarDespuesDecision(String, String, String, String)}:
	 * la nueva tarea ACTIVIDAD debe llevar el mismo índice de paso que el trámite (no +1), y no se incrementa
	 * {@link Tramite#getPasoActual()} aquí (solo al completar nodos ACTIVIDAD en {@link #avanzarFlujo}).
	 */
	private static final ThreadLocal<Boolean> CREANDO_TAREA_TRAS_DECISION = new ThreadLocal<>();

	private final PoliticaRepository politicaRepository;
	private final TramiteRepository tramiteRepository;
	private final TareaRepository tareaRepository;
	private final DepartamentoRepository departamentoRepository;
	private final UsuarioRepository usuarioRepository;
	private final ObjectProvider<TareaService> tareaServiceProvider;
	private final NotificacionService notificacionService;

	/**
	 * Tras completar una tarea: avanza el flujo según aristas de la política.
	 *
	 * @param eleccionRama etiqueta de arista (Sí/No) si aplica; {@code null} si aún no se eligió.
	 */
	public AvanzarFlujoResult avanzarFlujo(String tramiteId, String tareaId, String usuarioId, String eleccionRama) {
		Tarea tarea = tareaRepository.findById(tareaId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		if (!tramiteId.equals(tarea.getTramiteId())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "La tarea no pertenece al trámite");
		}
		if (tarea.getUsuarioAsignadoId() == null || !tarea.getUsuarioAsignadoId().equals(usuarioId)) {
			throw new ApiException(HttpStatus.FORBIDDEN, "La tarea no está asignada al usuario actual");
		}
		if (tarea.getEstado() == EstadoTarea.COMPLETADO) {
			return AvanzarFlujoResult.sinDecision();
		}

		Tramite tramite = tramiteRepository.findById(tramiteId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
		Politica politica = politicaRepository.findById(tramite.getPoliticaId())
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Política no encontrada"));

		NodoPolitica nodoActual = findNodoById(politica, tarea.getNodoFlujoId())
				.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Nodo de flujo inválido"));

		tarea.setEstado(EstadoTarea.COMPLETADO);
		tarea.setCompletadoEn(Instant.now());
		tareaRepository.save(tarea);

		tramite = tramiteRepository.findById(tramiteId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
		if (nodoActual.getTipo() == TipoNodo.ACTIVIDAD) {
			incrementarPasoTramitePorActividadCompletada(tramite);
			tramite = tramiteRepository.findById(tramiteId)
					.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
		}

		String rama = trimToNull(eleccionRama);

		List<AristaPolitica> salientes = aristasSalientes(politica, nodoActual.getId());
		if (nodoActual.getTipo() == TipoNodo.DECISION && rama != null) {
			salientes = salientes.stream()
					.filter(a -> rama.equalsIgnoreCase(trimToNull(a.getEtiqueta())))
					.toList();
		}

		List<NodoPolitica> siguientes = new ArrayList<>();
		List<String> etiquetasSiguiente = new ArrayList<>();
		for (AristaPolitica a : salientes) {
			Optional<NodoPolitica> on = findNodoById(politica, a.getHaciaNodoId());
			if (on.isPresent()) {
				siguientes.add(on.get());
				etiquetasSiguiente.add(trimToNull(a.getEtiqueta()));
			}
		}

		// Una sola arista desde ACTIVIDAD hacia nodo DECISION → esperar elección (sin rama)
		if (nodoActual.getTipo() == TipoNodo.ACTIVIDAD
				&& salientes.size() == 1
				&& siguientes.size() == 1
				&& siguientes.get(0).getTipo() == TipoNodo.DECISION
				&& rama == null) {
			NodoPolitica decision = siguientes.get(0);
			tramite.setEstado(EstadoTramite.ESPERANDO_DECISION);
			tramite.setNodoDecisionPendienteId(decision.getId());
			tramite.setActividadActual(decision.getEtiqueta());
			tramite.setActualizadoEn(Instant.now());
			tramiteRepository.save(tramite);
			notificarClienteTrasCompletarTarea(tramiteId, tarea);
			return construirResultadoEsperaDecision(politica, decision);
		}

		// Misma transición pero la rama viene en la misma petición COMPLETAR
		if (nodoActual.getTipo() == TipoNodo.ACTIVIDAD
				&& salientes.size() == 1
				&& siguientes.size() == 1
				&& siguientes.get(0).getTipo() == TipoNodo.DECISION
				&& rama != null) {
			NodoPolitica decision = siguientes.get(0);
			boolean hayMasTareas = expandirDesdeNodoDecisionConRama(tramite, politica, decision.getId(), rama);
			actualizarEstadoTramiteTrasAvance(tramiteId, hayMasTareas);
			notificarClienteTrasCompletarTarea(tramiteId, tarea);
			return AvanzarFlujoResult.sinDecision();
		}

		boolean hayMasTareas = false;
		for (int i = 0; i < siguientes.size(); i++) {
			hayMasTareas |= expandirDesdeNodo(tramite, politica, siguientes.get(i), etiquetasSiguiente.get(i));
		}

		actualizarEstadoTramiteTrasAvance(tramiteId, hayMasTareas);
		notificarClienteTrasCompletarTarea(tramiteId, tarea);
		return AvanzarFlujoResult.sinDecision();
	}

	private void notificarClienteTrasCompletarTarea(String tramiteId, Tarea tareaCompletada) {
		System.out.println("[notificarClienteTrasCompletarTarea] INICIO tramiteId=" + tramiteId
				+ " tareaId=" + tareaCompletada.getId());
		Tramite tr = tramiteRepository.findById(tramiteId).orElse(null);
		System.out.println("[notificarClienteTrasCompletarTarea] despues findById: tr="
				+ (tr == null ? "null" : "presente")
				+ " clienteId=" + (tr != null ? String.valueOf(tr.getClienteId()) : "n/a"));
		if (tr == null || tr.getClienteId() == null || tr.getClienteId().isBlank()) {
			System.out.println("[notificarClienteTrasCompletarTarea] SALIDA sin enviar (tramite null o clienteId vacío)");
			return;
		}
		String clienteId = tr.getClienteId();
		if (tr.getEstado() == EstadoTramite.COMPLETADO) {
			System.out.println("[notificarClienteTrasCompletarTarea] enviando Trámite completado clienteId=" + clienteId);
			notificacionService.enviar(clienteId, tramiteId, "Trámite completado",
					"Tu trámite ha sido completado exitosamente.");
			return;
		}
		String etiqueta = tareaCompletada.getActividadEtiqueta() != null
				? tareaCompletada.getActividadEtiqueta()
				: "—";
		System.out.println("[notificarClienteTrasCompletarTarea] enviando Actividad completada clienteId=" + clienteId
				+ " etiqueta=" + etiqueta);
		notificacionService.enviar(clienteId, tramiteId, "Actividad completada",
				"La actividad '" + etiqueta + "' fue completada. Tu trámite continúa.");
	}

	/**
	 * Continúa el flujo cuando el trámite está en {@link EstadoTramite#ESPERANDO_DECISION} tras elegir rama.
	 * No incrementa {@link Tramite#getPasoActual()} (solo lo hace completar una tarea de nodo ACTIVIDAD en
	 * {@link #avanzarFlujo}); no crea tarea para el nodo DECISION, solo expande por la arista elegida.
	 */
	public AvanzarFlujoResult continuarDespuesDecision(String tramiteId, String tareaId, String usuarioId, String rama) {
		String ramaNorm = trimToNull(rama);
		if (ramaNorm == null) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ramaDecision es obligatoria");
		}
		Tarea tarea = tareaRepository.findById(tareaId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		if (!tramiteId.equals(tarea.getTramiteId())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "La tarea no pertenece al trámite");
		}
		if (tarea.getUsuarioAsignadoId() == null || !tarea.getUsuarioAsignadoId().equals(usuarioId)) {
			throw new ApiException(HttpStatus.FORBIDDEN, "No autorizado");
		}
		if (tarea.getEstado() != EstadoTarea.COMPLETADO) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "La tarea debe estar completada");
		}
		Tramite tramite = tramiteRepository.findById(tramiteId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
		if (tramite.getEstado() != EstadoTramite.ESPERANDO_DECISION) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "El trámite no está esperando una decisión");
		}
		String nodoDecisionId = tramite.getNodoDecisionPendienteId();
		if (nodoDecisionId == null || nodoDecisionId.isBlank()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "No hay nodo de decisión pendiente");
		}
		Politica politica = politicaRepository.findById(tramite.getPoliticaId())
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Política no encontrada"));

		CREANDO_TAREA_TRAS_DECISION.set(Boolean.TRUE);
		boolean hayMasTareas;
		try {
			hayMasTareas = expandirDesdeNodoDecisionConRama(tramite, politica, nodoDecisionId, ramaNorm);
		} finally {
			CREANDO_TAREA_TRAS_DECISION.remove();
		}
		Tramite trActualizado = tramiteRepository.findById(tramiteId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
		trActualizado.setNodoDecisionPendienteId(null);
		trActualizado.setActualizadoEn(Instant.now());
		tramiteRepository.save(trActualizado);

		actualizarEstadoTramiteTrasAvance(tramiteId, hayMasTareas);
		return AvanzarFlujoResult.sinDecision();
	}

	private AvanzarFlujoResult construirResultadoEsperaDecision(Politica politica, NodoPolitica decision) {
		List<OpcionDecisionDTO> opciones = new ArrayList<>();
		for (AristaPolitica a : aristasSalientes(politica, decision.getId())) {
			String et = trimToNull(a.getEtiqueta());
			String etiquetaOpt = et != null ? et : "—";
			String desc = findNodoById(politica, a.getHaciaNodoId())
					.map(n -> n.getEtiqueta() != null && !n.getEtiqueta().isBlank()
							? "Siguiente: " + n.getEtiqueta().trim()
							: null)
					.orElse(null);
			opciones.add(OpcionDecisionDTO.builder()
					.etiqueta(etiquetaOpt)
					.descripcion(desc)
					.build());
		}
		String condicion = decision.getEtiqueta() != null && !decision.getEtiqueta().isBlank()
				? decision.getEtiqueta().trim()
				: "Decisión";
		return AvanzarFlujoResult.builder()
				.requiereDecision(true)
				.condicionDecision(condicion)
				.opcionesDecision(opciones)
				.build();
	}

	private boolean expandirDesdeNodoDecisionConRama(Tramite tramite, Politica politica, String nodoDecisionId, String rama) {
		List<AristaPolitica> filtradas = aristasSalientes(politica, nodoDecisionId).stream()
				.filter(a -> {
					String et = trimToNull(a.getEtiqueta());
					return et != null && rama.equalsIgnoreCase(et);
				})
				.toList();
		if (filtradas.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "No hay arista con la etiqueta indicada: " + rama);
		}
		boolean any = false;
		for (AristaPolitica a : filtradas) {
			Optional<NodoPolitica> next = findNodoById(politica, a.getHaciaNodoId());
			if (next.isPresent()) {
				any |= expandirDesdeNodo(tramite, politica, next.get(), trimToNull(a.getEtiqueta()));
			}
		}
		return any;
	}

	private void actualizarEstadoTramiteTrasAvance(String tramiteId, boolean hayMasTareasCreadas) {
		Tramite tr = tramiteRepository.findById(tramiteId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
		boolean todasTareasCompletas = tareaRepository.findByTramiteId(tramiteId).stream()
				.allMatch(t -> t.getEstado() == EstadoTarea.COMPLETADO);
		if (!hayMasTareasCreadas && todasTareasCompletas) {
			tr.setEstado(EstadoTramite.COMPLETADO);
			tr.setActividadActual("Completado");
			int total = tr.getTotalPasos() != null ? tr.getTotalPasos() : 0;
			if (total > 0) {
				tr.setPasoActual(total);
			}
		} else {
			tr.setEstado(EstadoTramite.EN_PROCESO);
		}
		tr.setActualizadoEn(Instant.now());
		tramiteRepository.save(tr);
	}

	/**
	 * {@code pasoActual} del trámite = cantidad de nodos ACTIVIDAD ya completados (no DECISION ni barras).
	 */
	private void incrementarPasoTramitePorActividadCompletada(Tramite tramite) {
		int total = tramite.getTotalPasos() != null ? tramite.getTotalPasos() : 0;
		int cur = tramite.getPasoActual() != null ? tramite.getPasoActual() : 0;
		int next = cur + 1;
		if (total > 0) {
			next = Math.min(next, total);
		}
		tramite.setPasoActual(next);
		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);
	}

	/**
	 * Crea tareas humanas a partir de un nodo (ACTIVIDAD o expansión de barras).
	 *
	 * @return true si se creó al menos una tarea pendiente.
	 */
	public boolean crearTareasDesdeNodo(Tramite tramite, NodoPolitica nodo) {
		if (nodo == null) {
			return false;
		}
		Politica politica = politicaRepository.findById(tramite.getPoliticaId())
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Política no encontrada"));
		return expandirDesdeNodo(tramite, politica, nodo, null);
	}

	/**
	 * Asigna un funcionario del departamento (menor carga de tareas no completadas).
	 */
	public Optional<String> asignarFuncionario(String departamentoId) {
		if (departamentoId == null || departamentoId.isBlank()) {
			return Optional.empty();
		}
		var candidatos = usuarioRepository.findByDepartamentoIdAndActivoTrue(departamentoId);
		if (candidatos.isEmpty()) {
			return Optional.empty();
		}
		return candidatos.stream()
				.min(Comparator.comparingLong(u -> tareaRepository
						.findByUsuarioAsignadoIdAndEstadoNot(u.getId(), EstadoTarea.COMPLETADO).size()))
				.map(u -> u.getId());
	}

	public void iniciarTramite(Tramite tramite) {
		Politica politica = politicaRepository.findById(tramite.getPoliticaId())
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Política no encontrada"));
		NodoPolitica start = politica.getNodos().stream()
				.filter(n -> n.getTipo() == TipoNodo.START)
				.findFirst()
				.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "La política no define nodo START"));

		boolean paralelo = politica.getNodos().stream().anyMatch(n -> n.getTipo() == TipoNodo.FORK_BAR);
		tramite.setEsParalelo(paralelo);
		int totalPasos = contarNodosActividad(politica);
		tramite.setTotalPasos(totalPasos);
		tramite.setPasoActual(0);
		tramiteRepository.save(tramite);

		for (AristaPolitica a : aristasSalientes(politica, start.getId())) {
			findNodoById(politica, a.getHaciaNodoId())
					.ifPresent(n -> expandirDesdeNodo(tramite, politica, n, trimToNull(a.getEtiqueta())));
		}
	}

	private boolean expandirDesdeNodo(Tramite tramite, Politica politica, NodoPolitica nodo, String aristaEtiquetaEntrada) {
		return switch (nodo.getTipo()) {
			case ACTIVIDAD -> {
				crearTareaActividad(tramite, politica, nodo, aristaEtiquetaEntrada);
				yield true;
			}
			case FORK_BAR -> {
				boolean any = false;
				for (AristaPolitica a : aristasSalientes(politica, nodo.getId())) {
					Optional<NodoPolitica> next = findNodoById(politica, a.getHaciaNodoId());
					if (next.isPresent()) {
						any |= expandirDesdeNodo(tramite, politica, next.get(), trimToNull(a.getEtiqueta()));
					}
				}
				yield any;
			}
			case JOIN_BAR -> {
				if (!puedeAvanzarJoinBar(tramite, politica, nodo)) {
					yield false;
				}
				boolean any = false;
				for (AristaPolitica a : aristasSalientes(politica, nodo.getId())) {
					Optional<NodoPolitica> next = findNodoById(politica, a.getHaciaNodoId());
					if (next.isPresent()) {
						any |= expandirDesdeNodo(tramite, politica, next.get(), trimToNull(a.getEtiqueta()));
					}
				}
				yield any;
			}
			case DECISION, START -> seguirTrasNodoTransicion(tramite, politica, nodo);
			case END -> false;
		};
	}

	private boolean seguirTrasNodoTransicion(Tramite tramite, Politica politica, NodoPolitica nodo) {
		if (nodo.getTipo() == TipoNodo.END) {
			return false;
		}
		boolean any = false;
		for (AristaPolitica a : aristasSalientes(politica, nodo.getId())) {
			Optional<NodoPolitica> next = findNodoById(politica, a.getHaciaNodoId());
			if (next.isPresent()) {
				any |= expandirDesdeNodo(tramite, politica, next.get(), trimToNull(a.getEtiqueta()));
			}
		}
		return any;
	}

	private void crearTareaActividad(Tramite tramite, Politica politica, NodoPolitica nodo, String aristaEtiquetaEntrada) {
		String deptoNombre = "";
		if (nodo.getDepartamentoId() != null) {
			deptoNombre = departamentoRepository.findById(nodo.getDepartamentoId())
					.map(Departamento::getNombre)
					.orElse("");
		}
		String asignado = asignarFuncionario(nodo.getDepartamentoId()).orElse(null);

		Tramite tramiteActual = tramiteRepository.findById(tramite.getId()).orElse(tramite);
		String nombreCliente = tareaServiceProvider.getObject().resolverNombreClienteParaNuevaTarea(tramiteActual);

		int completados = Optional.ofNullable(tramiteActual.getPasoActual()).orElse(0);
		int totalFlujo = Optional.ofNullable(tramiteActual.getTotalPasos()).orElse(0);
		boolean trasDecision = Boolean.TRUE.equals(CREANDO_TAREA_TRAS_DECISION.get());
		// Tras elegir rama: no se incrementa pasoActual del trámite; la nueva ACTIVIDAD usa el mismo índice de paso
		// que el contador actual (próxima humano-tarea aún no suma hasta completarse).
		int pasoMostrarEnTarea;
		if (trasDecision) {
			pasoMostrarEnTarea = totalFlujo > 0
					? Math.min(Math.max(completados, 1), totalFlujo)
					: Math.max(completados, 1);
		} else {
			pasoMostrarEnTarea = totalFlujo > 0
					? Math.min(completados + 1, totalFlujo)
					: Math.max(completados + 1, 1);
		}
		int totalMostrarEnTarea = totalFlujo > 0 ? totalFlujo : Math.max(pasoMostrarEnTarea, 1);

		Tarea t = Tarea.builder()
				.id(UUID.randomUUID().toString())
				.tramiteId(tramite.getId())
				.nodoFlujoId(nodo.getId())
				.aristaEtiquetaEntrada(trimToNull(aristaEtiquetaEntrada))
				.actividadEtiqueta(nodo.getEtiqueta())
				.departamentoTexto(deptoNombre)
				.politicaId(politica.getId())
				.politicaNombre(tramite.getPoliticaNombre())
				.pasoActual(pasoMostrarEnTarea)
				.totalPasos(totalMostrarEnTarea)
				.clienteNombre(nombreCliente)
				.tramiteClienteId(tramiteActual.getClienteId())
				.estado(EstadoTarea.PENDIENTE)
				.usuarioAsignadoId(asignado)
				.creadoEn(Instant.now())
				.build();
		tareaRepository.save(t);

		Tramite tramiteParaEstado = tramiteRepository.findById(tramite.getId())
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
		tramiteParaEstado.setActividadActual(nodo.getEtiqueta());
		tramiteParaEstado.setEstado(EstadoTramite.EN_PROCESO);
		tramiteParaEstado.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramiteParaEstado);
	}

	private static List<AristaPolitica> aristasSalientes(Politica p, String desdeId) {
		if (p.getAristas() == null) {
			return List.of();
		}
		return p.getAristas().stream()
				.filter(a -> desdeId.equals(a.getDesdeNodoId()))
				.toList();
	}

	/** Aristas cuyo destino es {@code haciaId}. */
	private static List<AristaPolitica> aristasEntrantes(Politica p, String haciaId) {
		if (p.getAristas() == null) {
			return List.of();
		}
		return p.getAristas().stream()
				.filter(a -> haciaId.equals(a.getHaciaNodoId()))
				.toList();
	}

	/**
	 * No expande tras el JOIN hasta que todas las tareas ACTIVIDAD de la región paralela
	 * (entre el FORK_BAR asociado y este JOIN) estén {@link EstadoTarea#COMPLETADO}.
	 */
	private boolean puedeAvanzarJoinBar(Tramite tramite, Politica politica, NodoPolitica join) {
		String joinId = join.getId();
		String forkId = encontrarForkBarParaJoin(politica, joinId);
		Set<String> idsActividad = new HashSet<>();
		if (forkId != null) {
			idsActividad.addAll(actividadNodesEnRegionForkJoin(politica, forkId, joinId));
		}
		if (idsActividad.isEmpty()) {
			idsActividad.addAll(actividadesDirectasAntesDeJoin(politica, joinId));
		}
		if (idsActividad.isEmpty()) {
			return true;
		}
		List<Tarea> tareas = tareaRepository.findByTramiteId(tramite.getId());
		for (String actId : idsActividad) {
			List<Tarea> ts = tareas.stream()
					.filter(t -> actId.equals(t.getNodoFlujoId()))
					.toList();
			if (ts.isEmpty()) {
				return false;
			}
			if (ts.stream().anyMatch(t -> t.getEstado() != EstadoTarea.COMPLETADO)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Busca un único FORK_BAR ancestro de las ramas que convergen en {@code joinId}
	 * (subiendo desde cada predecesor directo del JOIN).
	 */
	private static String encontrarForkBarParaJoin(Politica politica, String joinId) {
		Set<String> forks = new HashSet<>();
		for (AristaPolitica in : aristasEntrantes(politica, joinId)) {
			String f = buscarForkBarHaciaAtras(politica, in.getDesdeNodoId(), new HashSet<>());
			if (f != null) {
				forks.add(f);
			}
		}
		return forks.size() == 1 ? forks.iterator().next() : null;
	}

	private static String buscarForkBarHaciaAtras(Politica politica, String nodoId, Set<String> visitados) {
		if (!visitados.add(nodoId)) {
			return null;
		}
		Optional<NodoPolitica> n = findNodoById(politica, nodoId);
		if (n.isPresent() && n.get().getTipo() == TipoNodo.FORK_BAR) {
			return nodoId;
		}
		for (AristaPolitica in : aristasEntrantes(politica, nodoId)) {
			String ant = in.getDesdeNodoId();
			String f = buscarForkBarHaciaAtras(politica, ant, visitados);
			if (f != null) {
				return f;
			}
		}
		return null;
	}

	/**
	 * Nodos ACTIVIDAD alcanzables desde el FORK sin atravesar el JOIN (región paralela).
	 */
	private static Set<String> actividadNodesEnRegionForkJoin(Politica politica, String forkId, String joinId) {
		Set<String> actividadIds = new HashSet<>();
		Deque<String> dq = new ArrayDeque<>();
		for (AristaPolitica a : aristasSalientes(politica, forkId)) {
			dq.addLast(a.getHaciaNodoId());
		}
		Set<String> seen = new HashSet<>();
		while (!dq.isEmpty()) {
			String nid = dq.removeFirst();
			if (!seen.add(nid) || joinId.equals(nid)) {
				continue;
			}
			findNodoById(politica, nid).ifPresent(node -> {
				if (node.getTipo() == TipoNodo.ACTIVIDAD) {
					actividadIds.add(nid);
				}
			});
			for (AristaPolitica a : aristasSalientes(politica, nid)) {
				String h = a.getHaciaNodoId();
				if (!joinId.equals(h)) {
					dq.addLast(h);
				}
			}
		}
		return actividadIds;
	}

	/** Predecesores directos del JOIN que sean nodos ACTIVIDAD (fallback sin FORK detectado). */
	private static Set<String> actividadesDirectasAntesDeJoin(Politica politica, String joinId) {
		Set<String> out = new HashSet<>();
		for (AristaPolitica in : aristasEntrantes(politica, joinId)) {
			findNodoById(politica, in.getDesdeNodoId()).ifPresent(pred -> {
				if (pred.getTipo() == TipoNodo.ACTIVIDAD) {
					out.add(pred.getId());
				}
			});
		}
		return out;
	}

	private static Optional<NodoPolitica> findNodoById(Politica p, String id) {
		return p.getNodos().stream().filter(n -> id.equals(n.getId())).findFirst();
	}

	private static String trimToNull(String s) {
		if (s == null) {
			return null;
		}
		String t = s.trim();
		return t.isEmpty() ? null : t;
	}

	/**
	 * Solo nodos humanos ACTIVIDAD (excluye START, END, DECISION, FORK_BAR, JOIN_BAR).
	 * Público para reutilizar en {@link TramiteService} u otros servicios.
	 */
	public static int contarNodosActividad(Politica politica) {
		if (politica.getNodos() == null) {
			return 0;
		}
		return (int) politica.getNodos().stream()
				.filter(n -> n.getTipo() == TipoNodo.ACTIVIDAD)
				.count();
	}
}
