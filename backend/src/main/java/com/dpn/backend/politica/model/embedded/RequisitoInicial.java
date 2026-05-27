package com.dpn.backend.politica.model.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequisitoInicial {

	private String id;
	private String nombre;
	private String descripcion;
}
