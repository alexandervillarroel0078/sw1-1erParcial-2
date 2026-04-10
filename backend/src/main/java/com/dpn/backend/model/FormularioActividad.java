package com.dpn.backend.model;

import com.dpn.backend.model.embedded.CampoFormulario;
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
}
