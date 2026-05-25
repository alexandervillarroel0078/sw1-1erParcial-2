package com.dpn.backend.analisis.dto;

import com.dpn.backend.analisis.model.enums.EstadoAnalisisNodo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalisisNodoDetalleDTO {

	private String nodoId;
	private String etiqueta;
	private String departamento;
	private double tiempoPromedio;
	private long cantidadTareas;
	private int cantidadDemorados;
	private EstadoAnalisisNodo estado;
}
