package com.dpn.backend.cliente.model;

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
@Document(collection = "clientes")
public class Cliente {

	@Id
	private String id;
	@Field("nombre_completo")
	private String nombreCompleto;
	@Field("telefono")
	private String telefono;
	@Field("email")
	private String email;
	@Field("password_hash")
	private String passwordHash;
	@Field("token_fcm")
	private String tokenFcm;
	@Field("activo")
	private boolean activo;
	@Field("creado_en")
	private Instant creadoEn;
}
