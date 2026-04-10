package com.dpn.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notificaciones")
public class Notificacion {

	@Id
	private String id;
	@Field("cliente_id")
	private String clienteId;
	@Field("tramite_id")
	private String tramiteId;
	@Field("titulo")
	private String titulo;
	@Field("mensaje")
	private String mensaje;
	@Field("leida")
	private boolean leida;
	@Field("enviado_en")
	private Instant enviadoEn;
}
