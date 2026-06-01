package com.dpn.backend.colaborativo.service;

import com.dpn.backend.colaborativo.dto.OnlyOfficeCallbackRequest;
import com.dpn.backend.colaborativo.model.DocumentoColaborativo;
import com.dpn.backend.colaborativo.repository.DocumentoColaborativoRepository;
import com.dpn.backend.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentoColaborativoService {

	private static final String DOCX_PREFIX = "DOCX_B64:";

	private final DocumentoColaborativoRepository documentoColaborativoRepository;
	private final RestClient restClient = RestClient.create();

	public DocumentoColaborativo crearDocumento(
			String tramiteId,
			String nodoId,
			String titulo,
			String plantillaContenido) {
		documentoColaborativoRepository.findByTramiteIdAndNodoId(tramiteId, nodoId)
				.ifPresent(existing -> {
					throw new ApiException(
							HttpStatus.CONFLICT,
							"Ya existe un documento colaborativo para este trámite y nodo");
				});

		String tituloDoc = titulo != null && !titulo.isBlank()
				? titulo.trim()
				: "Documento colaborativo";

		DocumentoColaborativo documento = DocumentoColaborativo.builder()
				.id(UUID.randomUUID().toString())
				.tramiteId(tramiteId)
				.nodoId(nodoId)
				.titulo(tituloDoc)
				.plantillaContenido(plantillaContenido != null ? plantillaContenido : "")
				.documentKey(UUID.randomUUID().toString())
				.creadoEn(Instant.now())
				.build();

		return documentoColaborativoRepository.save(documento);
	}

	public DocumentoColaborativo obtener(String tramiteId, String nodoId) {
		DocumentoColaborativo doc = documentoColaborativoRepository.findByTramiteIdAndNodoId(tramiteId, nodoId)
				.orElseThrow(() -> new ApiException(
						HttpStatus.NOT_FOUND,
						"Documento colaborativo no encontrado"));
		doc.setDocumentKey(UUID.randomUUID().toString());
		return doc;
	}

	public ResponseEntity<byte[]> obtenerContenido(String tramiteId, String nodoId) {
		DocumentoColaborativo doc = obtener(tramiteId, nodoId);
		String contenido = doc.getPlantillaContenido();
		String nombreBase = sanitizeFilename(doc.getTitulo());

		if (contenido != null && contenido.startsWith(DOCX_PREFIX)) {
			byte[] bytes = Base64.getDecoder().decode(contenido.substring(DOCX_PREFIX.length()));
			return ResponseEntity.ok()
					.contentType(MediaType.parseMediaType(
							"application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
					.header("Content-Disposition", "inline; filename=\"" + nombreBase + ".docx\"")
					.body(bytes);
		}

		String texto = contenido != null ? contenido : "";
		byte[] docxBytes;
		try {
			docxBytes = generarDocxBasico(texto);
		} catch (IOException e) {
			throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo generar el documento DOCX");
		}
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(
						"application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
				.header("Content-Disposition", "inline; filename=\"" + nombreBase + ".docx\"")
				.body(docxBytes);
	}

	public Map<String, Integer> procesarCallback(
			String tramiteId,
			String nodoId,
			OnlyOfficeCallbackRequest request) {
		if (request.getStatus() == null) {
			return Map.of("error", 1);
		}

		int status = request.getStatus();
		if (status == 2 || status == 6) {
			DocumentoColaborativo doc = obtener(tramiteId, nodoId);
			String downloadUrl = request.getUrl();
			if (downloadUrl != null && !downloadUrl.isBlank()) {
				try {
					byte[] fileBytes = restClient.get()
							.uri(downloadUrl)
							.retrieve()
							.body(byte[].class);
					if (fileBytes != null && fileBytes.length > 0) {
						doc.setPlantillaContenido(encodeContent(fileBytes));
						doc.setDocumentKey(UUID.randomUUID().toString());
						documentoColaborativoRepository.save(doc);
					}
				} catch (Exception ex) {
					log.error("Error al descargar documento desde OnlyOffice: {}", ex.getMessage());
					return Map.of("error", 1);
				}
			}
		}

		return Map.of("error", 0);
	}

	private static String encodeContent(byte[] bytes) {
		if (bytes.length > 2 && bytes[0] == 'P' && bytes[1] == 'K') {
			return DOCX_PREFIX + Base64.getEncoder().encodeToString(bytes);
		}
		return new String(bytes, StandardCharsets.UTF_8);
	}

	private static String sanitizeFilename(String titulo) {
		if (titulo == null || titulo.isBlank()) {
			return "documento";
		}
		return titulo.trim().replaceAll("[^a-zA-Z0-9._\\- ]", "_");
	}

	private static byte[] generarDocxBasico(String texto) throws IOException {
		try (XWPFDocument document = new XWPFDocument();
			 ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			document.createParagraph().createRun().setText(texto != null ? texto : "");
			document.write(out);
			return out.toByteArray();
		}
	}
}
