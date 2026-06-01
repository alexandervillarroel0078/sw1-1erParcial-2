package com.dpn.backend.colaborativo.documento.controller;

import com.dpn.backend.colaborativo.documento.dto.CrearDocumentoColaborativoRequest;
import com.dpn.backend.colaborativo.documento.dto.OnlyOfficeCallbackRequest;
import com.dpn.backend.colaborativo.documento.model.DocumentoColaborativo;
import com.dpn.backend.colaborativo.documento.service.DocumentoColaborativoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/doc-colaborativo")
@RequiredArgsConstructor
public class DocumentoColaborativoRestController {

	private final DocumentoColaborativoService documentoColaborativoService;

	@PostMapping("/{tramiteId}/{nodoId}")
	public DocumentoColaborativo crear(
			@PathVariable String tramiteId,
			@PathVariable String nodoId,
			@RequestBody CrearDocumentoColaborativoRequest body) {
		return documentoColaborativoService.crearDocumento(
				tramiteId,
				nodoId,
				body.getTitulo(),
				body.getPlantillaContenido());
	}

	@GetMapping("/{tramiteId}/{nodoId}")
	public DocumentoColaborativo obtener(
			@PathVariable String tramiteId,
			@PathVariable String nodoId) {
		return documentoColaborativoService.obtener(tramiteId, nodoId);
	}

	@GetMapping("/{tramiteId}/{nodoId}/content")
	public ResponseEntity<byte[]> obtenerContenido(
			@PathVariable String tramiteId,
			@PathVariable String nodoId) {
		return documentoColaborativoService.obtenerContenido(tramiteId, nodoId);
	}

	@PostMapping("/{tramiteId}/{nodoId}/callback")
	public Map<String, Integer> callback(
			@PathVariable String tramiteId,
			@PathVariable String nodoId,
			@RequestBody OnlyOfficeCallbackRequest body) {
		return documentoColaborativoService.procesarCallback(tramiteId, nodoId, body);
	}
}
