package com.dpn.backend.controller;

import com.dpn.backend.dto.ArchivoUploadResponseDTO;
import com.dpn.backend.service.ArchivoService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/archivos")
@RequiredArgsConstructor
public class ArchivoController {

	private final ArchivoService archivoService;

	@PostMapping("/upload")
	public ArchivoUploadResponseDTO upload(@RequestParam("file") MultipartFile file) throws IOException {
		String id = archivoService.guardar(file);
		String nombre = file.getOriginalFilename() != null ? file.getOriginalFilename() : "archivo";
		String tipo = file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
		return ArchivoUploadResponseDTO.builder()
				.id(id)
				.nombre(nombre)
				.tipo(tipo)
				.tamanoBytes(file.getSize())
				.build();
	}

	@GetMapping("/{id}")
	public ResponseEntity<Resource> download(@PathVariable String id) {
		GridFsResource resource = archivoService.obtener(id);
		String filename = resource.getFilename() != null ? resource.getFilename() : id;
		String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
		if (resource.getContentType() != null) {
			contentType = resource.getContentType().toString();
		}
		String safeName = filename.replace("\"", "'");
		String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(contentType))
				.header(
						HttpHeaders.CONTENT_DISPOSITION,
						"inline; filename=\"" + safeName + "\"; filename*=UTF-8''" + encoded)
				.body(resource);
	}
}
