package com.dpn.backend.tramite.dto;

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
	@NotBlank
	private String clienteNombreCompleto;
	@NotBlank
	private String clienteTelefono;
	/** Opcional; si existe un cliente con este email se reutiliza. */
	private String clienteEmail;
}
