package com.dpn.backend.model;

import com.dpn.backend.model.enums.EstadoTarea;
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
@Document(collection = "tareas")
public class Tarea {

	@Id
	private String id;
	@Field("tramite_id")
	private String tramiteId;
	@Field("nodo_flujo_id")
	private String nodoFlujoId;
	@Field("actividad_etiqueta")
	private String actividadEtiqueta;
	@Field("departamento_texto")
	private String departamentoTexto;
	@Field("politica_nombre")
	private String politicaNombre;
	@Field("paso_actual")
	private int pasoActual;
	@Field("total_pasos")
	private int totalPasos;
	@Field("cliente_nombre")
	private String clienteNombre;
	@Field("dias_abierto")
	private Integer diasAbierto;
	@Field("usuario_asignado_id")
	private String usuarioAsignadoId;
	@Field("estado")
	private EstadoTarea estado;
	@Field("creado_en")
	private Instant creadoEn;
	@Field("completado_en")
	private Instant completadoEn;
}
