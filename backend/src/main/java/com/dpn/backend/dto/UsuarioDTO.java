package com.dpn.backend.dto;

import com.dpn.backend.model.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioDTO {

	private String id;
	private String nombre;
	private String correo;
	private RolUsuario rol;
	private String departamentoId;
	private boolean activo;
	private Instant creadoEn;
}
