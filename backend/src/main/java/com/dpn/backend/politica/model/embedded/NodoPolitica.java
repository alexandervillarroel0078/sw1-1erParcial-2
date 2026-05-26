package com.dpn.backend.politica.model.embedded;

import com.dpn.backend.politica.model.enums.TipoNodo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Field;

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
	private String departamentoTexto;
	private String calleId;
	private Double ancho;
	private Double alto;
	@Field("sla_minutos")
	private Integer slaMinutos;
	@Field("permiso_documentos")
	private String permisoDocumentos; // SIN_ACCESO, SOLO_VER, VER_MODIFICAR, ACCESO_COMPLETO
}
