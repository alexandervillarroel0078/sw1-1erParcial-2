package com.dpn.backend.model.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AristaPolitica {

	private String id;
	private String desdeNodoId;
	private String haciaNodoId;
	private String etiqueta;
}
