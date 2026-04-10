package com.dpn.backend.model.embedded;

import com.dpn.backend.model.enums.TipoCampo;
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
public class CampoFormulario {

	private String id;
	private int orden;
	private TipoCampo tipo;
	private String etiqueta;
	private String textoAyuda;
	private boolean obligatorio;
	@Builder.Default
	private List<String> opciones = new ArrayList<>();
}
