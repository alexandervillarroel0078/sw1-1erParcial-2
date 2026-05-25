package com.dpn.backend.tarea.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvanzarFlujoResult {

	@Builder.Default
	private boolean requiereDecision = false;
	private String condicionDecision;
	@Builder.Default
	private List<OpcionDecisionDTO> opcionesDecision = new ArrayList<>();

	public static AvanzarFlujoResult sinDecision() {
		return AvanzarFlujoResult.builder()
				.requiereDecision(false)
				.opcionesDecision(List.of())
				.build();
	}
}
