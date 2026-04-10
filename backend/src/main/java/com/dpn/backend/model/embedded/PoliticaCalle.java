package com.dpn.backend.model.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoliticaCalle {

	private String id;
	private String nombre;
	private String color;
	private int orden;
	private String departamentoId;
	private Integer anchoPx;
	private Integer altoPx;
}
