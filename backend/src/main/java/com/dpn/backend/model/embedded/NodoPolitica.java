package com.dpn.backend.model.embedded;

import com.dpn.backend.model.enums.TipoNodo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NodoPolitica {

	private String id;
	private TipoNodo tipo;
	private String etiqueta;
	private double posicionX;
	private double posicionY;
	private String departamentoId;
	private String calleId;
	private Double ancho;
	private Double alto;
	private Integer slaHoras;
}
