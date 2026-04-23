package com.dpn.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CambioCanvasDTO {

	private String usuarioId;
	private String tipo;
	private List<Map<String, Object>> nodos;
	private List<Map<String, Object>> aristas;
	private List<Map<String, Object>> calles;
}
