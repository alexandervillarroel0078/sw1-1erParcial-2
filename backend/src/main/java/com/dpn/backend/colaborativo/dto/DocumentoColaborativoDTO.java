package com.dpn.backend.colaborativo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentoColaborativoDTO {

	private String usuarioId;
	private String usuarioNombre;
	private String seccionId;
	private String contenido;
	private Instant timestamp;
}
