package com.dpn.backend.model.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArchivoAdjunto {

	private String id;
	private String nombre;
	private String url;
	private String tipo;
	private Long tamanoBytes;
	private Instant subidoEn;
}
