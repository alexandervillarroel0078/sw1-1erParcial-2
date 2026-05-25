package com.dpn.backend.politica.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActividadCatalogoDTO {

	private String etiqueta;
	private int paso;
}
