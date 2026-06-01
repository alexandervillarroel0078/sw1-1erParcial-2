package com.dpn.backend.colaborativo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "documentos_colaborativos")
public class DocumentoColaborativo {

	@Id
	private String id;
	private String tramiteId;
	private String nodoId;
	private String titulo;
	private String plantillaContenido;
	private String documentKey;
	private Instant creadoEn;
}
