package com.dpn.backend.colaborativo.documento.model.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeccionDocumento {

	private String id;
	private String titulo;
	private String contenido;
}
