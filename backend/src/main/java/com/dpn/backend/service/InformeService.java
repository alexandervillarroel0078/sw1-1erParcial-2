package com.dpn.backend.service;

import com.dpn.backend.dto.InformeCreateDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.model.Informe;
import com.dpn.backend.repository.InformeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InformeService {

	private final InformeRepository informeRepository;

	public Informe crear(InformeCreateDTO dto, String funcionarioId) {
		Instant now = Instant.now();
		Informe i = Informe.builder()
				.id(UUID.randomUUID().toString())
				.tramiteId(dto.getTramiteId())
				.tareaId(dto.isEsBorrador() ? null : dto.getTareaId())
				.funcionarioId(funcionarioId)
				.nodoActividadId(dto.getNodoActividadId())
				.descripcion(dto.getDescripcion())
				.resultado(dto.getResultado())
				.observaciones(dto.getObservaciones())
				.archivos(dto.getArchivos() != null ? dto.getArchivos() : List.of())
				.esBorrador(dto.isEsBorrador())
				.creadoEn(now)
				.enviadoEn(dto.isEsBorrador() ? null : now)
				.build();
		return informeRepository.save(i);
	}

	public List<Informe> listarPorTramite(String tramiteId) {
		return informeRepository.findByTramiteIdOrderByCreadoEnDesc(tramiteId);
	}

	/**
	 * Informe asociado a la tarea; solo el funcionario autor del informe puede verlo.
	 */
	public Informe obtenerPorTareaId(String tareaId, String funcionarioId) {
		Informe i = informeRepository.findByTareaId(tareaId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Informe no encontrado"));
		if (i.getFuncionarioId() == null || !i.getFuncionarioId().equals(funcionarioId)) {
			throw new ApiException(HttpStatus.NOT_FOUND, "Informe no encontrado");
		}
		return i;
	}
}
