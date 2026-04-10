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
public class TareaAccionRequest {

	/** "ATENDER" | "COMPLETAR" */
	@NotBlank
	private String accion;
	/** Para nodos DECISION: rama elegida (ej. Sí / No). */
	private String etiquetaArista;
}
