package com.dpn.backend.documento.dto;

import lombok.*;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentoDTO {
    private String id;
    private String tramiteId;
    private String nodoId;
    private String nombre;
    private String tipo;
    private Long tamanoBytes;
    private String subidoPorNombre;
    private Instant subidoEn;
    private String urlDescarga;
}
