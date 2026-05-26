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
@Document(collection = "documentos")
public class Documento {
    @Id
    private String id;
    @Field("tramite_id")
    private String tramiteId;
    @Field("nodo_id")
    private String nodoId;
    private String nombre;
    private String tipo;
    @Field("tamano_bytes")
    private Long tamanoBytes;
    @Field("storage_key")
    private String storageKey;
    @Field("subido_por_id")
    private String subidoPorId;
    @Field("subido_por_nombre")
    private String subidoPorNombre;
    @Field("subido_en")
    private Instant subidoEn;
    @Field("ultima_modificacion")
    private Instant ultimaModificacion;
}
