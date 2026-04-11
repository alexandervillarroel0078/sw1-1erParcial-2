package com.dpn.backend.model.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AristaPolitica {

	private String id;
	private String desdeNodoId;
	private String haciaNodoId;
	private String etiqueta;
	/** N/S/E/O cuando el destino es DECISIÓN (puerto de entrada en el lienzo). */
	@Field("hacia_puerto")
	private String haciaPuerto;
}
