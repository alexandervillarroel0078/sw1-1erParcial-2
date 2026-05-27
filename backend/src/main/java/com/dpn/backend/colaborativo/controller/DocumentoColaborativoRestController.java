package com.dpn.backend.colaborativo.controller;

import com.dpn.backend.colaborativo.model.DocumentoColaborativo;
import com.dpn.backend.colaborativo.service.DocumentoColaborativoService;
import com.dpn.backend.usuario.model.Usuario;
import com.dpn.backend.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/doc-colaborativo")
@RequiredArgsConstructor
public class DocumentoColaborativoRestController {

	private final DocumentoColaborativoService documentoColaborativoService;
	private final UsuarioRepository usuarioRepository;

	@GetMapping("/{tramiteId}/{nodoId}")
	public DocumentoColaborativo obtener(
			@PathVariable String tramiteId,
			@PathVariable String nodoId) {
		return documentoColaborativoService.obtener(tramiteId, nodoId);
	}

	@PutMapping("/{tramiteId}/{nodoId}")
	public DocumentoColaborativo guardar(
			@PathVariable String tramiteId,
			@PathVariable String nodoId,
			@RequestBody DocumentoColaborativo documento,
			Authentication auth) {
		documento.setTramiteId(tramiteId);
		documento.setNodoId(nodoId);
		documento.setUltimaModificacion(Instant.now());
		documento.setUltimoEditorNombre(resolverUsuarioNombre(auth.getName()));
		return documentoColaborativoService.guardar(documento);
	}

	private String resolverUsuarioNombre(String usuarioId) {
		return usuarioRepository.findById(usuarioId)
				.map(Usuario::getNombre)
				.orElse(usuarioId);
	}
}
