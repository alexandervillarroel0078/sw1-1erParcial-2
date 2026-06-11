package com.dpn.backend.documento.service;

import com.dpn.backend.cliente.repository.ClienteRepository;
import com.dpn.backend.documento.dto.DocumentoDTO;
import com.dpn.backend.documento.model.AuditoriaDocumento;
import com.dpn.backend.documento.model.Documento;
import com.dpn.backend.documento.repository.AuditoriaDocumentoRepository;
import com.dpn.backend.documento.repository.DocumentoRepository;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.auth.model.enums.RolUsuario;
import com.dpn.backend.tarea.model.Tarea;
import com.dpn.backend.tarea.model.enums.EstadoTarea;
import com.dpn.backend.tarea.repository.TareaRepository;
import com.dpn.backend.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentoService {
    private static final String MSG_SIN_ACCESO = "No tienes acceso a los documentos de este trámite";
    private static final String MSG_SOLO_VER = "Solo tienes permiso de visualización";
    private static final String MSG_NO_ELIMINAR_CLIENTE = "No se pueden eliminar documentos del cliente";
    private static final String MSG_NO_ELIMINAR_OTRO = "No puedes eliminar documentos de otro usuario";

    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final DocumentoRepository documentoRepository;
    private final AuditoriaDocumentoRepository auditoriaRepository;
    private final TareaRepository tareaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;

    @Value("${storage.bucket}")
    private String bucket;

    public DocumentoDTO subir(MultipartFile file, String tramiteId, String nodoId,
                               String usuarioId, String usuarioNombre) {
        return subir(file, tramiteId, nodoId, usuarioId, usuarioNombre, false);
    }

    public DocumentoDTO subir(
            MultipartFile file,
            String tramiteId,
            String nodoId,
            String usuarioId,
            String usuarioNombre,
            boolean omitirValidacionPermisos) {
        if (!omitirValidacionPermisos) {
            validarPermisoFuncionario(tramiteId, nodoId, usuarioId, AccionDocumento.SUBIR, null);
        }
        try {
            String storageKey = tramiteId + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(storageKey)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            Documento doc = Documento.builder()
                    .id(UUID.randomUUID().toString())
                    .tramiteId(tramiteId)
                    .nodoId(nodoId)
                    .nombre(file.getOriginalFilename())
                    .tipo(file.getContentType())
                    .tamanoBytes(file.getSize())
                    .storageKey(storageKey)
                    .subidoPorId(usuarioId)
                    .subidoPorNombre(usuarioNombre)
                    .subidoEn(Instant.now())
                    .ultimaModificacion(Instant.now())
                    .build();
            documentoRepository.save(doc);

            registrarAuditoria(doc.getId(), tramiteId, nodoId, usuarioId, usuarioNombre, "SUBIDA");
            return toDTO(doc);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al subir archivo: " + e.getMessage());
        }
    }

    public List<DocumentoDTO> listarPorTramite(String tramiteId, String usuarioId, String usuarioNombre) {
        validarPermisoFuncionario(tramiteId, null, usuarioId, AccionDocumento.VER, null);
        List<Documento> docs = documentoRepository.findByTramiteId(tramiteId);
        docs.forEach(d -> registrarAuditoria(d.getId(), tramiteId, d.getNodoId(), usuarioId, usuarioNombre, "ACCESO"));
        return docs.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<DocumentoDTO> listarPorNodo(String tramiteId, String nodoId) {
        String usuarioId = obtenerUsuarioAutenticado();
        if (usuarioId != null) {
            validarPermisoFuncionario(tramiteId, nodoId, usuarioId, AccionDocumento.VER, null);
        }
        return documentoRepository.findByTramiteIdAndNodoId(tramiteId, nodoId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public String generarUrlDescarga(String documentoId, String usuarioId, String usuarioNombre) {
        Documento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Documento no encontrado"));
        validarPermisoFuncionario(doc.getTramiteId(), doc.getNodoId(), usuarioId, AccionDocumento.VER, null);
        try {
            registrarAuditoria(documentoId, doc.getTramiteId(), doc.getNodoId(), usuarioId, usuarioNombre, "DESCARGA");
            return presigner.presignGetObject(
                    GetObjectPresignRequest.builder()
                            .signatureDuration(Duration.ofHours(1))
                            .getObjectRequest(r -> r.bucket(bucket).key(doc.getStorageKey()))
                            .build())
                    .url().toString();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al generar URL: " + e.getMessage());
        }
    }

    public List<AuditoriaDocumento> listarAuditoriaPorDocumento(String documentoId) {
        return auditoriaRepository.findByDocumentoId(documentoId);
    }

    public List<AuditoriaDocumento> listarAuditoriaPorTramite(String tramiteId) {
        return auditoriaRepository.findByTramiteIdOrderByTimestampDesc(tramiteId);
    }

    public void eliminar(String documentoId, String usuarioId, String usuarioNombre) {
        Documento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Documento no encontrado"));
        validarPermisoFuncionario(doc.getTramiteId(), doc.getNodoId(), usuarioId, AccionDocumento.ELIMINAR, doc);
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(doc.getStorageKey())
                    .build());
            registrarAuditoria(documentoId, doc.getTramiteId(), doc.getNodoId(), usuarioId, usuarioNombre, "ELIMINACION");
            documentoRepository.deleteById(documentoId);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al eliminar: " + e.getMessage());
        }
    }

    private enum AccionDocumento {
        VER, SUBIR, ELIMINAR
    }

    private void validarPermisoFuncionario(
            String tramiteId,
            String nodoId,
            String usuarioId,
            AccionDocumento accion,
            Documento documento) {
        if (!esFuncionario(usuarioId)) {
            return;
        }

        Tarea tarea = buscarTareaActiva(tramiteId, usuarioId, nodoId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, MSG_SIN_ACCESO));

        String permiso = normalizarPermiso(tarea.getPermisoDocumentos());

        if ("SIN_ACCESO".equals(permiso)) {
            throw new ApiException(HttpStatus.FORBIDDEN, MSG_SIN_ACCESO);
        }

        if ("SOLO_VER".equals(permiso) && accion != AccionDocumento.VER) {
            throw new ApiException(HttpStatus.FORBIDDEN, MSG_SOLO_VER);
        }

        if (accion == AccionDocumento.ELIMINAR && documento != null) {
            if (esDocumentoDeCliente(documento)) {
                throw new ApiException(HttpStatus.FORBIDDEN, MSG_NO_ELIMINAR_CLIENTE);
            }
            if ("VER_MODIFICAR".equals(permiso) || "VER_Y_MODIFICAR".equals(permiso)) {
                if (!usuarioId.equals(documento.getSubidoPorId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, MSG_NO_ELIMINAR_OTRO);
                }
            }
        }
    }

    private Optional<Tarea> buscarTareaActiva(String tramiteId, String usuarioId, String nodoId) {
        List<Tarea> activas = tareaRepository.findByTramiteId(tramiteId).stream()
                .filter(t -> usuarioId.equals(t.getUsuarioAsignadoId()))
                .filter(t -> t.getEstado() != EstadoTarea.COMPLETADO)
                .toList();

        if (nodoId != null && !nodoId.isBlank()) {
            Optional<Tarea> porNodo = activas.stream()
                    .filter(t -> nodoId.equals(t.getNodoFlujoId()))
                    .findFirst();
            if (porNodo.isPresent()) {
                return porNodo;
            }
        }
        return activas.stream().findFirst();
    }

    private boolean esFuncionario(String usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .map(u -> u.getRol() == RolUsuario.FUNCIONARIO)
                .orElse(false);
    }

    private boolean esDocumentoDeCliente(Documento documento) {
        String subidoPorId = documento.getSubidoPorId();
        return subidoPorId != null && !subidoPorId.isBlank()
                && clienteRepository.findById(subidoPorId).isPresent();
    }

    private String normalizarPermiso(String permiso) {
        if (permiso == null || permiso.isBlank()) {
            return "ACCESO_COMPLETO";
        }
        return permiso.trim().toUpperCase();
    }

    private String obtenerUsuarioAutenticado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        String name = auth.getName();
        if (name == null || name.isBlank() || "anonymousUser".equals(name)) {
            return null;
        }
        return name;
    }

    private void registrarAuditoria(String documentoId, String tramiteId, String nodoId,
                                     String usuarioId, String usuarioNombre, String accion) {
        auditoriaRepository.save(AuditoriaDocumento.builder()
                .id(UUID.randomUUID().toString())
                .documentoId(documentoId)
                .tramiteId(tramiteId)
                .nodoId(nodoId)
                .usuarioId(usuarioId)
                .usuarioNombre(usuarioNombre)
                .accion(accion)
                .timestamp(Instant.now())
                .build());
    }

    private DocumentoDTO toDTO(Documento doc) {
        return DocumentoDTO.builder()
                .id(doc.getId())
                .tramiteId(doc.getTramiteId())
                .nodoId(doc.getNodoId())
                .nombre(doc.getNombre())
                .tipo(doc.getTipo())
                .tamanoBytes(doc.getTamanoBytes())
                .subidoPorNombre(doc.getSubidoPorNombre())
                .subidoEn(doc.getSubidoEn())
                .build();
    }
}
