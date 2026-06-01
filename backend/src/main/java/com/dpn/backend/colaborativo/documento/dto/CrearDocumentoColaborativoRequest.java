package com.dpn.backend.colaborativo.documento.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrearDocumentoColaborativoRequest {

	private String titulo;
	private String plantillaContenido;
}
