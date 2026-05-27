package com.dpn.backend.formulario.model;

import com.dpn.backend.formulario.model.embedded.CampoFormulario;
import com.dpn.backend.formulario.model.embedded.SeccionPlantilla;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "formularios_actividad")
public class FormularioActividad {

	@Id
	private String id;
	@Field("nodo_actividad_id")
	private String nodoActividadId;
	@Field("politica_id")
	private String politicaId;
	@Field("campos")
	@Builder.Default
	private List<CampoFormulario> campos = new ArrayList<>();
	@Field("titulo_documento_colaborativo")
	private String tituloDocumentoColaborativo;
	@Field("secciones_documento_colaborativo")
	@Builder.Default
	private List<SeccionPlantilla> seccionesDocumentoColaborativo = new ArrayList<>();
	@JsonProperty("habilitadoDocumentoColaborativo")
	@Field("habilitado_documento_colaborativo")
	@Builder.Default
	private boolean habilitadoDocumentoColaborativo = false;
}
