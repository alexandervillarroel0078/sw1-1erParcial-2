package com.dpn.backend.service;

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

	/**
	 * Tras completar una tarea: avanza el flujo según aristas de la política.
	 *
	 * @param etiquetaArista opcional para ramas DECISION (ej. "Sí", "No").
	 */
	public void avanzarFlujo(String tramiteId, String tareaId, String usuarioId, String etiquetaArista) {
		Tarea tarea = tareaRepository.findById(tareaId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		if (!tramiteId.equals(tarea.getTramiteId())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "La tarea no pertenece al trámite");
		}
		if (tarea.getUsuarioAsignadoId() == null || !tarea.getUsuarioAsignadoId().equals(usuarioId)) {
			throw new ApiException(HttpStatus.FORBIDDEN, "La tarea no está asignada al usuario actual");
		}
		if (tarea.getEstado() == EstadoTarea.COMPLETADO) {
			return;
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

		List<AristaPolitica> salientes = aristasSalientes(politica, nodoActual.getId());
		if (nodoActual.getTipo() == TipoNodo.DECISION && etiquetaArista != null && !etiquetaArista.isBlank()) {
			salientes = salientes.stream()
					.filter(a -> etiquetaArista.equalsIgnoreCase(trimToNull(a.getEtiqueta())))
					.toList();
		}

		List<NodoPolitica> siguientes = new ArrayList<>();
		for (AristaPolitica a : salientes) {
			findNodoById(politica, a.getHaciaNodoId()).ifPresent(siguientes::add);
		}

		boolean hayMasTareas = false;
		for (NodoPolitica sig : siguientes) {
			hayMasTareas |= expandirDesdeNodo(tramite, politica, sig);
		}

		if (!hayMasTareas && tareaRepository.findByTramiteId(tramiteId).stream()
				.allMatch(t -> t.getEstado() == EstadoTarea.COMPLETADO)) {
			tramite.setEstado(EstadoTramite.COMPLETADO);
			tramite.setActividadActual(null);
			tramite.setActualizadoEn(Instant.now());
			tramiteRepository.save(tramite);
		} else {
			tramite.setEstado(EstadoTramite.EN_PROCESO);
			tramite.setActualizadoEn(Instant.now());
			tramiteRepository.save(tramite);
		}
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
		return expandirDesdeNodo(tramite, politica, nodo);
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
		int totalPasos = (int) politica.getNodos().stream().filter(n -> n.getTipo() == TipoNodo.ACTIVIDAD).count();
		tramite.setTotalPasos(totalPasos);
		tramite.setPasoActual(1);
		tramiteRepository.save(tramite);

		for (AristaPolitica a : aristasSalientes(politica, start.getId())) {
			findNodoById(politica, a.getHaciaNodoId()).ifPresent(n -> expandirDesdeNodo(tramite, politica, n));
		}
	}

	private boolean expandirDesdeNodo(Tramite tramite, Politica politica, NodoPolitica nodo) {
		return switch (nodo.getTipo()) {
			case ACTIVIDAD -> {
				crearTareaActividad(tramite, politica, nodo);
				yield true;
			}
			case FORK_BAR -> {
				boolean any = false;
				for (AristaPolitica a : aristasSalientes(politica, nodo.getId())) {
					Optional<NodoPolitica> next = findNodoById(politica, a.getHaciaNodoId());
					if (next.isPresent()) {
						any |= expandirDesdeNodo(tramite, politica, next.get());
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
						any |= expandirDesdeNodo(tramite, politica, next.get());
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
				any |= expandirDesdeNodo(tramite, politica, next.get());
			}
		}
		return any;
	}

	private void crearTareaActividad(Tramite tramite, Politica politica, NodoPolitica nodo) {
		String deptoNombre = "";
		if (nodo.getDepartamentoId() != null) {
			deptoNombre = departamentoRepository.findById(nodo.getDepartamentoId())
					.map(Departamento::getNombre)
					.orElse("");
		}
		String asignado = asignarFuncionario(nodo.getDepartamentoId()).orElse(null);

		Tarea t = Tarea.builder()
				.id(UUID.randomUUID().toString())
				.tramiteId(tramite.getId())
				.nodoFlujoId(nodo.getId())
				.actividadEtiqueta(nodo.getEtiqueta())
				.departamentoTexto(deptoNombre)
				.politicaNombre(tramite.getPoliticaNombre())
				.pasoActual(Optional.ofNullable(tramite.getPasoActual()).orElse(1))
				.totalPasos(Optional.ofNullable(tramite.getTotalPasos()).orElse(1))
				.clienteNombre(null)
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
}
