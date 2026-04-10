package com.dpn.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

	private String token;
	/** Perfil staff (sin passwordHash). */
	private UsuarioDTO usuario;
	/** Perfil cliente (sin passwordHash). */
	private ClientePublicDTO cliente;
}
