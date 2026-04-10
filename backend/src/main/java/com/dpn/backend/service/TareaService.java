package com.dpn.backend.service;

import com.dpn.backend.dto.TareaAccionRequest;
import com.dpn.backend.dto.TareaDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.mapper.EntityMapper;
import com.dpn.backend.model.Tarea;
import com.dpn.backend.model.enums.EstadoTarea;
import com.dpn.backend.repository.TareaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TareaService {

	private final TareaRepository tareaRepository;
	private final WorkflowEngine workflowEngine;

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
		workflowEngine.avanzarFlujo(t.getTramiteId(), id, usuarioId,
				req != null ? req.getEtiquetaArista() : null);
		return tareaRepository.findById(id).map(EntityMapper::toTareaDTO)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
	}
}
