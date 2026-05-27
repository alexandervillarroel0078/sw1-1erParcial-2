package com.dpn.backend.colaborativo.model;

import com.dpn.backend.colaborativo.model.embedded.SeccionDocumento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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
	private String politicaId;
	private String titulo;
	@Builder.Default
	private List<SeccionDocumento> secciones = new ArrayList<>();
	private Instant ultimaModificacion;
	private String ultimoEditorNombre;
}
