package com.dpn.backend.formulario.model.embedded;

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
public class SeccionPlantilla {

	private String id;
	private String titulo;
	private String tipo;
	private boolean obligatorio;
	@Builder.Default
	private List<String> opciones = new ArrayList<>();
}
