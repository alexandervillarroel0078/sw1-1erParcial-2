package com.dpn.backend.usuario.dto;

import com.dpn.backend.auth.model.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioUpdateRequest {

	private String nombre;
	private String correo;
	/** Si viene no vacío, se actualiza la contraseña. */
	private String password;
	private RolUsuario rol;
	private String departamentoId;
	private Boolean activo;
}
