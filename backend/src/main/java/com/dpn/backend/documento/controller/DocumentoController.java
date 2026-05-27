package com.dpn.backend.documento.controller;

import com.dpn.backend.documento.dto.DocumentoDTO;
import com.dpn.backend.documento.model.AuditoriaDocumento;
import com.dpn.backend.documento.service.DocumentoService;
import com.dpn.backend.usuario.model.Usuario;
import com.dpn.backend.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/documentos")
@RequiredArgsConstructor
public class DocumentoController {
    private final DocumentoService documentoService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping("/tramite/{tramiteId}/nodo/{nodoId}/upload")
    public DocumentoDTO subir(
            @PathVariable String tramiteId,
            @PathVariable String nodoId,
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        try {
            log.info("Upload request - tramiteId: {}, nodoId: {}, file: {}, user: {}",
                    tramiteId, nodoId, file.getOriginalFilename(), auth.getName());
            String usuarioId = auth.getName();
            String usuarioNombre = usuarioRepository.findById(usuarioId)
                    .map(u -> u.getNombre()).orElse(usuarioId);
            return documentoService.subir(file, tramiteId, nodoId, usuarioId, usuarioNombre);
        } catch (Exception e) {
            log.error("Error en upload - tramiteId: {}, nodoId: {}, error: {}",
                    tramiteId, nodoId, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/tramite/{tramiteId}")
    public List<DocumentoDTO> listarPorTramite(@PathVariable String tramiteId, Authentication auth) {
        String usuarioId = auth.getName();
        String usuarioNombre = resolverUsuarioNombre(usuarioId);
        return documentoService.listarPorTramite(tramiteId, usuarioId, usuarioNombre);
    }

    @GetMapping("/tramite/{tramiteId}/auditoria")
    public List<AuditoriaDocumento> listarAuditoriaPorTramite(@PathVariable String tramiteId) {
        return documentoService.listarAuditoriaPorTramite(tramiteId);
    }

    @GetMapping("/tramite/{tramiteId}/nodo/{nodoId}")
    public List<DocumentoDTO> listarPorNodo(@PathVariable String tramiteId, @PathVariable String nodoId) {
        return documentoService.listarPorNodo(tramiteId, nodoId);
    }

    @GetMapping("/{documentoId}/auditoria")
    public List<AuditoriaDocumento> listarAuditoriaPorDocumento(@PathVariable String documentoId) {
        return documentoService.listarAuditoriaPorDocumento(documentoId);
    }

    @GetMapping("/{documentoId}/url")
    public Map<String, String> obtenerUrl(@PathVariable String documentoId, Authentication auth) {
        String usuarioId = auth.getName();
        String usuarioNombre = resolverUsuarioNombre(usuarioId);
        String url = documentoService.generarUrlDescarga(documentoId, usuarioId, usuarioNombre);
        return Map.of("url", url);
    }

    @DeleteMapping("/{documentoId}")
    public Map<String, String> eliminar(@PathVariable String documentoId, Authentication auth) {
        String usuarioId = auth.getName();
        String usuarioNombre = resolverUsuarioNombre(usuarioId);
        documentoService.eliminar(documentoId, usuarioId, usuarioNombre);
        return Map.of("mensaje", "Documento eliminado");
    }

    private String resolverUsuarioNombre(String usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .map(Usuario::getNombre)
                .orElse(usuarioId);
    }
}
