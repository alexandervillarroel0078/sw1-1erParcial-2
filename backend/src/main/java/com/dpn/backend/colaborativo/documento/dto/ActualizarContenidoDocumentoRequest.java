package com.dpn.backend.colaborativo.documento.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActualizarContenidoDocumentoRequest {

	private String contenido;
}
