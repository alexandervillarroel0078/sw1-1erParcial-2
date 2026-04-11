package com.dpn.backend.dto;

import com.dpn.backend.model.enums.RolUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioCreateRequest {

	@NotBlank
	private String nombre;
	@Email
	@NotBlank
	private String correo;
	@NotBlank
	private String password;
	@NotNull
	private RolUsuario rol;
	private String departamentoId;
	/** Con {@code @Builder}: el valor por defecto solo aplica si se usa {@code @Builder.Default}. */
	@Builder.Default
	private boolean activo = true;
}
