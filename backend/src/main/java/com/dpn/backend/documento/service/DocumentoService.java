package com.dpn.backend.documento.service;

import com.dpn.backend.documento.dto.DocumentoDTO;
import com.dpn.backend.documento.model.AuditoriaDocumento;
import com.dpn.backend.documento.model.Documento;
import com.dpn.backend.documento.repository.AuditoriaDocumentoRepository;
import com.dpn.backend.documento.repository.DocumentoRepository;
import com.dpn.backend.exception.ApiException;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentoService {
    private final MinioClient minioClient;
    private final DocumentoRepository documentoRepository;
    private final AuditoriaDocumentoRepository auditoriaRepository;

    @Value("${minio.bucket}")
    private String bucket;

    public DocumentoDTO subir(MultipartFile file, String tramiteId, String nodoId,
                               String usuarioId, String usuarioNombre) {
        try {
            String storageKey = tramiteId + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(storageKey)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());

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

            registrarAuditoria(doc.getId(), tramiteId, usuarioId, usuarioNombre, "SUBIDA");
            return toDTO(doc);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al subir archivo: " + e.getMessage());
        }
    }

    public List<DocumentoDTO> listarPorTramite(String tramiteId, String usuarioId, String usuarioNombre) {
        List<Documento> docs = documentoRepository.findByTramiteId(tramiteId);
        docs.forEach(d -> registrarAuditoria(d.getId(), tramiteId, usuarioId, usuarioNombre, "ACCESO"));
        return docs.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<DocumentoDTO> listarPorNodo(String tramiteId, String nodoId) {
        return documentoRepository.findByTramiteIdAndNodoId(tramiteId, nodoId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public String generarUrlDescarga(String documentoId, String usuarioId, String usuarioNombre) {
        Documento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Documento no encontrado"));
        try {
            registrarAuditoria(documentoId, doc.getTramiteId(), usuarioId, usuarioNombre, "DESCARGA");
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .bucket(bucket)
                    .object(doc.getStorageKey())
                    .method(Method.GET)
                    .expiry(1, TimeUnit.HOURS)
                    .build());
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al generar URL: " + e.getMessage());
        }
    }

    public void eliminar(String documentoId, String usuarioId, String usuarioNombre) {
        Documento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Documento no encontrado"));
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(doc.getStorageKey())
                    .build());
            registrarAuditoria(documentoId, doc.getTramiteId(), usuarioId, usuarioNombre, "ELIMINACION");
            documentoRepository.deleteById(documentoId);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al eliminar: " + e.getMessage());
        }
    }

    private void registrarAuditoria(String documentoId, String tramiteId, 
                                     String usuarioId, String usuarioNombre, String accion) {
        auditoriaRepository.save(AuditoriaDocumento.builder()
                .id(UUID.randomUUID().toString())
                .documentoId(documentoId)
                .tramiteId(tramiteId)
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
