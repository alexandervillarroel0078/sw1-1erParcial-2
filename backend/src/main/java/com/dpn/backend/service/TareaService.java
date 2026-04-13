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
import com.dpn.backend.model.Politica;
import com.dpn.backend.model.Tarea;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.model.Usuario;
import com.dpn.backend.model.embedded.NodoPolitica;
import com.dpn.backend.model.enums.EstadoTarea;
import com.dpn.backend.model.enums.EstadoTramite;
import com.dpn.backend.model.enums.TipoNodo;
import com.dpn.backend.repository.InformeRepository;
import com.dpn.backend.repository.PoliticaRepository;
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
	private final PoliticaRepository politicaRepository;
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
		Map<String, Tramite> tramiteCache = new HashMap<>();
		Map<String, Politica> politicaCache = new HashMap<>();
		return tareaRepository.findByUsuarioAsignadoId(usuarioId).stream()
				.map((t) -> {
					TareaDTO dto = EntityMapper.toTareaDTO(t);
					enrichMisTareaMeta(t, dto, tramiteCache, politicaCache);
					return dto;
				})
				.toList();
	}

	/**
	 * SLA del nodo y estado del trámite para la bandeja del funcionario.
	 */
	private void enrichMisTareaMeta(
			Tarea t,
			TareaDTO dto,
			Map<String, Tramite> tramiteCache,
			Map<String, Politica> politicaCache) {
		if (t.getTramiteId() == null) {
			return;
		}
		Tramite tramite = tramiteCache.computeIfAbsent(
				t.getTramiteId(),
				id -> tramiteRepository.findById(id).orElse(null));
		if (tramite == null) {
			return;
		}
		EstadoTramite estTr = tramite.getEstado();
		if (estTr != null) {
			dto.setTramiteEstado(estTr);
		}
		if (t.getNodoFlujoId() == null || t.getNodoFlujoId().isBlank()
				|| tramite.getPoliticaId() == null) {
			return;
		}
		Politica politica = politicaCache.computeIfAbsent(
				tramite.getPoliticaId(),
				id -> politicaRepository.findById(id).orElse(null));
		if (politica == null || politica.getNodos() == null) {
			return;
		}
		politica.getNodos().stream()
				.filter(n -> t.getNodoFlujoId().equals(n.getId()))
				.findFirst()
				.map(NodoPolitica::getSlaMinutos)
				.ifPresent(dto::setSlaMinutos);
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

		Map<String, TipoNodo> tipoPorNodoFlujoId = mapTipoNodoPorId(
				politicaRepository.findById(tramite.getPoliticaId()).orElse(null));

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
			String tipoNodoNombre = tipoNodoNombreParaTarea(nodoId, tipoPorNodoFlujoId);

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
					.tipoNodo(tipoNodoNombre)
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

	private static Map<String, TipoNodo> mapTipoNodoPorId(Politica politica) {
		if (politica == null || politica.getNodos() == null) {
			return Map.of();
		}
		Map<String, TipoNodo> out = new HashMap<>();
		for (NodoPolitica n : politica.getNodos()) {
			if (n.getId() != null && n.getTipo() != null) {
				out.put(n.getId(), n.getTipo());
			}
		}
		return out;
	}

	private static String tipoNodoNombreParaTarea(String nodoFlujoId, Map<String, TipoNodo> tipoPorNodoFlujoId) {
		if (nodoFlujoId == null) {
			return null;
		}
		TipoNodo tipo = tipoPorNodoFlujoId.get(nodoFlujoId);
		return tipo != null ? tipo.name() : null;
	}

	private InformeResumenDTO mapInformeResumen(Informe i) {
		return InformeResumenDTO.builder()
				.descripcion(i.getDescripcion())
				.resultado(i.getResultado())
				.enviadoEn(i.getEnviadoEn())
				.archivos(i.getArchivos() != null ? i.getArchivos() : List.of())
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
