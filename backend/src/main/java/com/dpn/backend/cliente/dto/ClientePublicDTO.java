package com.dpn.backend.cliente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientePublicDTO {

	private String id;
	private String nombreCompleto;
	private String telefono;
	private String email;
	private String tokenFcm;
	private boolean activo;
	private Instant creadoEn;
}
