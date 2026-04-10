package com.dpn.backend.model;

import com.dpn.backend.model.embedded.ArchivoAdjunto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "informes")
public class Informe {

	@Id
	private String id;
	@Field("tramite_id")
	private String tramiteId;
	@Field("funcionario_id")
	private String funcionarioId;
	@Field("nodo_actividad_id")
	private String nodoActividadId;
	@Field("descripcion")
	private String descripcion;
	@Field("resultado")
	private String resultado;
	@Field("observaciones")
	private String observaciones;
	@Field("archivos")
	@Builder.Default
	private List<ArchivoAdjunto> archivos = new ArrayList<>();
	@Field("es_borrador")
	private boolean esBorrador;
	@Field("creado_en")
	private Instant creadoEn;
	@Field("enviado_en")
	private Instant enviadoEn;
}
