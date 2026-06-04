package com.dpn.backend.politica.model.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequisitoInicial {

	private String id;
	private String nombre;
	private String descripcion;
	/** imagen | pdf | documento | cualquiera (default) */
	@Field("tipo_archivo")
	private String tipoArchivo;
}
