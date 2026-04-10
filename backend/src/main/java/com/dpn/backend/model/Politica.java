package com.dpn.backend.model;

import com.dpn.backend.model.embedded.AristaPolitica;
import com.dpn.backend.model.embedded.NodoPolitica;
import com.dpn.backend.model.embedded.PoliticaCalle;
import com.dpn.backend.model.enums.OrientacionCalles;
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
@Document(collection = "politicas")
public class Politica {

	@Id
	private String id;
	@Field("nombre")
	private String nombre;
	@Field("subtitulo")
	private String subtitulo;
	@Field("color_tema")
	private String colorTema;
	@Field("activa")
	private boolean activa;
	@Field("fecha_creacion")
	private Instant fechaCreacion;
	@Field("orientacion_calles")
	private OrientacionCalles orientacionCalles;
	@Field("nodos")
	@Builder.Default
	private List<NodoPolitica> nodos = new ArrayList<>();
	@Field("aristas")
	@Builder.Default
	private List<AristaPolitica> aristas = new ArrayList<>();
	@Field("calles_diseno")
	@Builder.Default
	private List<PoliticaCalle> callesDiseno = new ArrayList<>();
}
