package com.dpn.backend.colaborativo.service;

import com.dpn.backend.colaborativo.model.DocumentoColaborativo;
import com.dpn.backend.colaborativo.repository.DocumentoColaborativoRepository;
import com.dpn.backend.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentoColaborativoService {

	private final DocumentoColaborativoRepository documentoColaborativoRepository;

	public DocumentoColaborativo obtener(String tramiteId, String nodoId) {
		return documentoColaborativoRepository.findByTramiteIdAndNodoId(tramiteId, nodoId)
				.orElseGet(() -> DocumentoColaborativo.builder()
						.tramiteId(tramiteId)
						.nodoId(nodoId)
						.titulo("")
						.secciones(new ArrayList<>())
						.build());
	}

	public DocumentoColaborativo guardar(DocumentoColaborativo documento) {
		var existing = documentoColaborativoRepository.findByTramiteIdAndNodoId(
				documento.getTramiteId(), documento.getNodoId());
		if (existing.isPresent()) {
			DocumentoColaborativo actual = existing.get();
			actual.setPoliticaId(documento.getPoliticaId());
			actual.setTitulo(documento.getTitulo());
			actual.setSecciones(documento.getSecciones() != null
					? documento.getSecciones()
					: new ArrayList<>());
			actual.setUltimaModificacion(documento.getUltimaModificacion() != null
					? documento.getUltimaModificacion()
					: Instant.now());
			actual.setUltimoEditorNombre(documento.getUltimoEditorNombre());
			return documentoColaborativoRepository.save(actual);
		}
		if (documento.getId() == null || documento.getId().isBlank()) {
			documento.setId(UUID.randomUUID().toString());
		}
		if (documento.getSecciones() == null) {
			documento.setSecciones(new ArrayList<>());
		}
		if (documento.getUltimaModificacion() == null) {
			documento.setUltimaModificacion(Instant.now());
		}
		return documentoColaborativoRepository.save(documento);
	}

	public DocumentoColaborativo actualizarSeccion(
			String tramiteId,
			String nodoId,
			String seccionId,
			String contenido,
			String editorNombre) {
		DocumentoColaborativo documento = documentoColaborativoRepository
				.findByTramiteIdAndNodoId(tramiteId, nodoId)
				.orElseThrow(() -> new ApiException(
						HttpStatus.NOT_FOUND, "Documento colaborativo no encontrado"));

		boolean seccionActualizada = documento.getSecciones().stream()
				.filter(seccion -> seccionId.equals(seccion.getId()))
				.findFirst()
				.map(seccion -> {
					seccion.setContenido(contenido);
					return true;
				})
				.orElse(false);

		if (!seccionActualizada) {
			throw new ApiException(HttpStatus.NOT_FOUND, "Sección no encontrada");
		}

		documento.setUltimaModificacion(Instant.now());
		documento.setUltimoEditorNombre(editorNombre);
		return documentoColaborativoRepository.save(documento);
	}
}
