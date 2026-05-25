package com.dpn.backend.archivo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArchivoUploadResponseDTO {

	private String id;
	private String nombre;
	private String tipo;
	private long tamanoBytes;
}
