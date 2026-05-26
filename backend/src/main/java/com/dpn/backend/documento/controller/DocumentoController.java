package com.dpn.backend.documento.controller;

import com.dpn.backend.documento.dto.DocumentoDTO;
import com.dpn.backend.documento.service.DocumentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documentos")
@RequiredArgsConstructor
public class DocumentoController {
    private final DocumentoService documentoService;

    @PostMapping("/tramite/{tramiteId}/nodo/{nodoId}/upload")
    public DocumentoDTO subir(
            @PathVariable String tramiteId,
            @PathVariable String nodoId,
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        String nombre = auth.getName();
        return documentoService.subir(file, tramiteId, nodoId, nombre, nombre);
    }

    @GetMapping("/tramite/{tramiteId}")
    public List<DocumentoDTO> listarPorTramite(@PathVariable String tramiteId, Authentication auth) {
        return documentoService.listarPorTramite(tramiteId, auth.getName(), auth.getName());
    }

    @GetMapping("/tramite/{tramiteId}/nodo/{nodoId}")
    public List<DocumentoDTO> listarPorNodo(@PathVariable String tramiteId, @PathVariable String nodoId) {
        return documentoService.listarPorNodo(tramiteId, nodoId);
    }

    @GetMapping("/{documentoId}/url")
    public Map<String, String> obtenerUrl(@PathVariable String documentoId, Authentication auth) {
        String url = documentoService.generarUrlDescarga(documentoId, auth.getName(), auth.getName());
        return Map.of("url", url);
    }

    @DeleteMapping("/{documentoId}")
    public Map<String, String> eliminar(@PathVariable String documentoId, Authentication auth) {
        documentoService.eliminar(documentoId, auth.getName(), auth.getName());
        return Map.of("mensaje", "Documento eliminado");
    }
}
