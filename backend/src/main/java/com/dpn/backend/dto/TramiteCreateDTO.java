package com.dpn.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TramiteCreateDTO {

	@NotBlank
	private String politicaId;
	private String clienteId;
	/** Si no se envía clienteId, se crea/obtiene cliente con estos datos. */
	private String clienteNombreCompleto;
	private String clienteTelefono;
	private String clienteEmail;
}
