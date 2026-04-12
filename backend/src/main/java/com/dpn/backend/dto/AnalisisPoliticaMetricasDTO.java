package com.dpn.backend.dto;

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
public class AnalisisPoliticaMetricasDTO {

	private String politicaId;
	private int tramitesAnalizados;
	private int totalDemorados;
	private double tiempoPromedioTotal;
	private String nodoCriticoId;
	private String nodoCriticoEtiqueta;
	private double nodoCriticoPromedio;
	@Builder.Default
	private List<AnalisisNodoDetalleDTO> detalleNodos = new ArrayList<>();
}
