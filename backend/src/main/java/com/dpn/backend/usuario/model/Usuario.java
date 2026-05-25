package com.dpn.backend.usuario.model;

import com.dpn.backend.auth.model.enums.RolUsuario;
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
@Document(collection = "usuarios")
public class Usuario {

	@Id
	private String id;
	@Field("nombre")
	private String nombre;
	@Field("correo")
	private String correo;
	@Field("password_hash")
	private String passwordHash;
	@Field("rol")
	private RolUsuario rol;
	@Field("departamento_id")
	private String departamentoId;
	@Field("activo")
	private boolean activo;
	@Field("creado_en")
	private Instant creadoEn;
}
