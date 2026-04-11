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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkflowEngine {

	private final PoliticaRepository politicaRepository;
	private final TramiteRepository tramiteRepository;
	private final TareaRepository tareaRepository;
	private final DepartamentoRepository departamentoRepository;
	private final UsuarioRepository usuarioRepository;
	private final ObjectProvider<TareaService> tareaServiceProvider;

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
			return AvanzarFlujoResult.sinDecision();
		}

		boolean hayMasTareas = false;
		for (int i = 0; i < siguientes.size(); i++) {
			hayMasTareas |= expandirDesdeNodo(tramite, politica, siguientes.get(i), etiquetasSiguiente.get(i));
		}

		actualizarEstadoTramiteTrasAvance(tramiteId, hayMasTareas);
		return AvanzarFlujoResult.sinDecision();
	}

	/**
	 * Continúa el flujo cuando el trámite está en {@link EstadoTramite#ESPERANDO_DECISION} tras elegir rama.
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

		boolean hayMasTareas = expandirDesdeNodoDecisionConRama(tramite, politica, nodoDecisionId, ramaNorm);
		tramite.setNodoDecisionPendienteId(null);
		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);

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
				// TODO: sincronizar ramas paralelas antes de seguir (contador / estado de join)
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
		int pasoMostrarEnTarea = totalFlujo > 0 ? Math.min(completados + 1, totalFlujo) : Math.max(completados + 1, 1);
		int totalMostrarEnTarea = totalFlujo > 0 ? totalFlujo : Math.max(pasoMostrarEnTarea, 1);

		Tarea t = Tarea.builder()
				.id(UUID.randomUUID().toString())
				.tramiteId(tramite.getId())
				.nodoFlujoId(nodo.getId())
				.aristaEtiquetaEntrada(trimToNull(aristaEtiquetaEntrada))
				.actividadEtiqueta(nodo.getEtiqueta())
				.departamentoTexto(deptoNombre)
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

		tramite.setActividadActual(nodo.getEtiqueta());
		tramite.setEstado(EstadoTramite.EN_PROCESO);
		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);
	}

	private static List<AristaPolitica> aristasSalientes(Politica p, String desdeId) {
		return p.getAristas().stream()
				.filter(a -> desdeId.equals(a.getDesdeNodoId()))
				.toList();
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

	/** Solo nodos humanos ACTIVIDAD (excluye START, END, DECISION, FORK_BAR, JOIN_BAR). */
	private static int contarNodosActividad(Politica politica) {
		if (politica.getNodos() == null) {
			return 0;
		}
		return (int) politica.getNodos().stream()
				.filter(n -> n.getTipo() == TipoNodo.ACTIVIDAD)
				.count();
	}
}
