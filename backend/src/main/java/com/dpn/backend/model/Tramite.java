package com.dpn.backend.model;

import com.dpn.backend.model.enums.EstadoTramite;
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
@Document(collection = "tramites")
public class Tramite {

	@Id
	private String id;
	@Field("politica_id")
	private String politicaId;
	@Field("politica_nombre")
	private String politicaNombre;
	@Field("cliente_id")
	private String clienteId;
	@Field("creado_por_usuario_id")
	private String creadoPorUsuarioId;
	@Field("estado")
	private EstadoTramite estado;
	@Field("es_paralelo")
	private Boolean esParalelo;
	@Field("actividad_actual")
	private String actividadActual;
	@Field("paso_actual")
	private Integer pasoActual;
	@Field("total_pasos")
	private Integer totalPasos;
	@Field("creado_en")
	private Instant creadoEn;
	@Field("actualizado_en")
	private Instant actualizadoEn;
}
