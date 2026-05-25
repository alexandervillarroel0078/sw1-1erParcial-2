package com.dpn.backend.informe.service;

import com.dpn.backend.informe.dto.InformeCreateDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.informe.model.Informe;
import com.dpn.backend.archivo.model.embedded.ArchivoAdjunto;
import com.dpn.backend.informe.repository.InformeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InformeService {

	private final InformeRepository informeRepository;

	public Informe crear(InformeCreateDTO dto, String funcionarioId) {
		Instant now = Instant.now();
		List<ArchivoAdjunto> archivosNorm = normalizarArchivos(dto.getArchivos(), now);
		Informe i = Informe.builder()
				.id(UUID.randomUUID().toString())
				.tramiteId(dto.getTramiteId())
				.tareaId(dto.isEsBorrador() ? null : dto.getTareaId())
				.funcionarioId(funcionarioId)
				.nodoActividadId(dto.getNodoActividadId())
				.descripcion(dto.getDescripcion())
				.resultado(dto.getResultado())
				.observaciones(dto.getObservaciones())
				.archivos(archivosNorm)
				.esBorrador(dto.isEsBorrador())
				.creadoEn(now)
				.enviadoEn(dto.isEsBorrador() ? null : now)
				.build();
		return informeRepository.save(i);
	}

	private static List<ArchivoAdjunto> normalizarArchivos(List<ArchivoAdjunto> in, Instant ahora) {
		if (in == null || in.isEmpty()) {
			return List.of();
		}
		List<ArchivoAdjunto> out = new ArrayList<>(in.size());
		for (ArchivoAdjunto a : in) {
			if (a.getId() == null || a.getId().isBlank()) {
				continue;
			}
			out.add(ArchivoAdjunto.builder()
					.id(a.getId())
					.nombre(a.getNombre())
					.url(a.getUrl())
					.tipo(a.getTipo())
					.tamanoBytes(a.getTamanoBytes())
					.subidoEn(a.getSubidoEn() != null ? a.getSubidoEn() : ahora)
					.build());
		}
		return out;
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
