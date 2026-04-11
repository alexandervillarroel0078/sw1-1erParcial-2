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

	/** "ATENDER" | "COMPLETAR" | "DECIDIR" */
	@NotBlank
	private String accion;
	/** Rama elegida en COMPLETAR (opcional) o DECIDIR (obligatorio), ej. Sí / No. */
	private String ramaDecision;
	/** @deprecated usar {@link #ramaDecision} */
	private String etiquetaArista;
}
