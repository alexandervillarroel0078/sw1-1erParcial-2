package com.dpn.backend.service;

import com.dpn.backend.dto.AvanzarFlujoResult;
import com.dpn.backend.dto.InformeResumenDTO;
import com.dpn.backend.dto.TareaAccionRequest;
import com.dpn.backend.dto.TareaDTO;
import com.dpn.backend.dto.TareaTramiteDetalleDTO;
import com.dpn.backend.dto.TramiteDetalleAdminResponse;
import com.dpn.backend.dto.TramiteResumenDetalleDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.mapper.EntityMapper;
import com.dpn.backend.model.Informe;
import com.dpn.backend.model.Tarea;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.model.Usuario;
import com.dpn.backend.model.enums.EstadoTarea;
import com.dpn.backend.repository.InformeRepository;
import com.dpn.backend.repository.TareaRepository;
import com.dpn.backend.repository.TramiteRepository;
import com.dpn.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TareaService {

	private final TareaRepository tareaRepository;
	private final TramiteRepository tramiteRepository;
	private final InformeRepository informeRepository;
	private final UsuarioRepository usuarioRepository;
	private final WorkflowEngine workflowEngine;
	private final ClienteService clienteService;

	/**
	 * Al crear tareas del flujo ({@link WorkflowEngine}): nombre visible a partir del trámite / cliente.
	 */
	public String resolverNombreClienteParaNuevaTarea(Tramite tramite) {
		return clienteService.resolverNombreParaTarea(tramite);
	}

	public List<TareaDTO> listarMisTareas(String usuarioId) {
		return tareaRepository.findByUsuarioAsignadoId(usuarioId).stream()
				.map(EntityMapper::toTareaDTO)
				.toList();
	}

	public List<TareaDTO> listarTodas() {
		return tareaRepository.findAll().stream()
				.map(EntityMapper::toTareaDTO)
				.toList();
	}

	public TareaDTO obtenerPorId(String id, String usuarioId) {
		Tarea t = tareaRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		if (t.getUsuarioAsignadoId() == null || !t.getUsuarioAsignadoId().equals(usuarioId)) {
			throw new ApiException(HttpStatus.FORBIDDEN, "No autorizado");
		}
		return EntityMapper.toTareaDTO(t);
	}

	public TareaDTO atender(String id, String usuarioId) {
		Tarea t = tareaRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		if (t.getUsuarioAsignadoId() == null || !t.getUsuarioAsignadoId().equals(usuarioId)) {
			throw new ApiException(HttpStatus.FORBIDDEN, "No autorizado");
		}
		t.setEstado(EstadoTarea.EN_ATENCION);
		return EntityMapper.toTareaDTO(tareaRepository.save(t));
	}

	public TareaDTO completar(String id, String usuarioId, TareaAccionRequest req) {
		Tarea t = tareaRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		if (t.getUsuarioAsignadoId() == null || !t.getUsuarioAsignadoId().equals(usuarioId)) {
			throw new ApiException(HttpStatus.FORBIDDEN, "No autorizado");
		}
		AvanzarFlujoResult r = workflowEngine.avanzarFlujo(t.getTramiteId(), id, usuarioId, eleccionRama(req));
		Tarea guardada = tareaRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		return enrichDtoConDecision(EntityMapper.toTareaDTO(guardada), r);
	}

	public TramiteDetalleAdminResponse obtenerDetalleTramite(String tramiteId) {
		Tramite tramite = tramiteRepository.findById(tramiteId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));

		List<Tarea> tareas = new ArrayList<>(tareaRepository.findByTramiteId(tramiteId));
		tareas.sort(Comparator.comparing(Tarea::getCreadoEn, Comparator.nullsLast(Comparator.naturalOrder())));

		Map<String, Long> vecesPorNodo = tareas.stream()
				.filter(t -> t.getNodoFlujoId() != null)
				.collect(Collectors.groupingBy(Tarea::getNodoFlujoId, Collectors.counting()));
		boolean tieneActividadIterativa = vecesPorNodo.values().stream().anyMatch(n -> n > 1);

		Map<String, Integer> ocurrenciaPorNodo = new HashMap<>();
		Instant ahora = Instant.now();
		Set<String> idsParalelos = detectarIdsParalelos(tareas, ahora);

		List<TareaTramiteDetalleDTO> lista = new ArrayList<>(tareas.size());
		for (Tarea t : tareas) {
			String nodoId = t.getNodoFlujoId();
			int sec = nodoId == null ? 1 : ocurrenciaPorNodo.merge(nodoId, 1, Integer::sum);
			long totalNodo = nodoId == null ? 1L : vecesPorNodo.getOrDefault(nodoId, 1L);
			boolean esIter = totalNodo > 1;

			Optional<Informe> infOpt = informeRepository.findByTareaId(t.getId());
			InformeResumenDTO informeDto = infOpt.map(this::mapInformeResumen).orElse(null);

			String nombreUsuario = null;
			if (t.getUsuarioAsignadoId() != null) {
				nombreUsuario = usuarioRepository.findById(t.getUsuarioAsignadoId())
						.map(Usuario::getNombre)
						.orElse(null);
			}

			Instant inicio = t.getCreadoEn() != null ? t.getCreadoEn() : ahora;
			Instant fin = t.getCompletadoEn() != null ? t.getCompletadoEn() : ahora;
			int dias = (int) Math.max(0, ChronoUnit.DAYS.between(inicio, fin));

			String decision = trimNullToNull(t.getAristaEtiquetaEntrada());

			lista.add(TareaTramiteDetalleDTO.builder()
					.id(t.getId())
					.nodoFlujoId(t.getNodoFlujoId())
					.actividadEtiqueta(t.getActividadEtiqueta())
					.departamentoTexto(t.getDepartamentoTexto())
					.usuarioAsignadoNombre(nombreUsuario)
					.estado(t.getEstado())
					.creadoEn(t.getCreadoEn())
					.completadoEn(t.getCompletadoEn())
					.diasAbierto(dias)
					.esParalelo(idsParalelos.contains(t.getId()))
					.esIterativo(esIter)
					.iterativoSecuencia(sec)
					.decisionEtiqueta(decision)
					.informe(informeDto)
					.build());
		}

		TramiteResumenDetalleDTO resumen = TramiteResumenDetalleDTO.builder()
				.id(tramite.getId())
				.politicaNombre(tramite.getPoliticaNombre())
				.clienteNombre(tramite.getClienteNombre())
				.estado(tramite.getEstado())
				.creadoEn(tramite.getCreadoEn())
				.pasoActual(tramite.getPasoActual())
				.totalPasos(tramite.getTotalPasos())
				.esFlujoParalelo(tramite.getEsParalelo())
				.tieneActividadIterativa(tieneActividadIterativa)
				.build();

		return TramiteDetalleAdminResponse.builder()
				.tramite(resumen)
				.tareas(lista)
				.build();
	}

	private InformeResumenDTO mapInformeResumen(Informe i) {
		return InformeResumenDTO.builder()
				.descripcion(i.getDescripcion())
				.resultado(i.getResultado())
				.enviadoEn(i.getEnviadoEn())
				.build();
	}

	private static Set<String> detectarIdsParalelos(List<Tarea> tareas, Instant now) {
		Set<String> out = new HashSet<>();
		for (int i = 0; i < tareas.size(); i++) {
			Tarea a = tareas.get(i);
			if (a.getCreadoEn() == null) {
				continue;
			}
			for (int j = i + 1; j < tareas.size(); j++) {
				Tarea b = tareas.get(j);
				if (b.getCreadoEn() == null) {
					continue;
				}
				if (intervalosActivosSolapados(a, b, now)) {
					out.add(a.getId());
					out.add(b.getId());
				}
			}
		}
		return out;
	}

	private static boolean intervalosActivosSolapados(Tarea a, Tarea b, Instant now) {
		Instant startA = a.getCreadoEn();
		Instant startB = b.getCreadoEn();
		Instant endA = a.getCompletadoEn() != null ? a.getCompletadoEn() : now;
		Instant endB = b.getCompletadoEn() != null ? b.getCompletadoEn() : now;
		return !startA.isAfter(endB) && !startB.isAfter(endA);
	}

	private static String trimNullToNull(String s) {
		if (s == null) {
			return null;
		}
		String t = s.trim();
		return t.isEmpty() ? null : t;
	}

	public TareaDTO decidir(String id, String usuarioId, TareaAccionRequest req) {
		Tarea t = tareaRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		if (t.getUsuarioAsignadoId() == null || !t.getUsuarioAsignadoId().equals(usuarioId)) {
			throw new ApiException(HttpStatus.FORBIDDEN, "No autorizado");
		}
		String rama = eleccionRama(req);
		if (rama == null || rama.isBlank()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ramaDecision es obligatoria");
		}
		workflowEngine.continuarDespuesDecision(t.getTramiteId(), id, usuarioId, rama);
		Tarea guardada = tareaRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
		return enrichDtoConDecision(EntityMapper.toTareaDTO(guardada), AvanzarFlujoResult.sinDecision());
	}

	private static String eleccionRama(TareaAccionRequest req) {
		if (req == null) {
			return null;
		}
		if (req.getRamaDecision() != null && !req.getRamaDecision().isBlank()) {
			return req.getRamaDecision().trim();
		}
		if (req.getEtiquetaArista() != null && !req.getEtiquetaArista().isBlank()) {
			return req.getEtiquetaArista().trim();
		}
		return null;
	}

	private static TareaDTO enrichDtoConDecision(TareaDTO dto, AvanzarFlujoResult r) {
		if (dto == null || r == null) {
			return dto;
		}
		dto.setRequiereDecision(r.isRequiereDecision());
		if (r.isRequiereDecision()) {
			dto.setCondicionDecision(r.getCondicionDecision());
			dto.setOpcionesDecision(r.getOpcionesDecision() != null
					? new ArrayList<>(r.getOpcionesDecision())
					: new ArrayList<>());
		} else {
			dto.setCondicionDecision(null);
			dto.setOpcionesDecision(null);
		}
		return dto;
	}
}
