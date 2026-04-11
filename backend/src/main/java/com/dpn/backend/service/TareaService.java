package com.dpn.backend.service;

import com.dpn.backend.dto.AvanzarFlujoResult;
import com.dpn.backend.dto.TareaAccionRequest;
import com.dpn.backend.dto.TareaDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.mapper.EntityMapper;
import com.dpn.backend.model.Tarea;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.model.enums.EstadoTarea;
import com.dpn.backend.repository.TareaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TareaService {

	private final TareaRepository tareaRepository;
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
