package com.dpn.backend.documento.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "auditoria_documentos")
public class AuditoriaDocumento {
    @Id
    private String id;
    @Field("documento_id")
    private String documentoId;
    @Field("tramite_id")
    private String tramiteId;
    @Field("usuario_id")
    private String usuarioId;
    @Field("usuario_nombre")
    private String usuarioNombre;
    private String accion; // SUBIDA, DESCARGA, ELIMINACION
    private Instant timestamp;
}
