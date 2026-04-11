package com.dpn.backend.dto;

import com.dpn.backend.model.enums.EstadoTarea;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TareaTramiteDetalleDTO {

	private String id;
	private String nodoFlujoId;
	private String actividadEtiqueta;
	private String departamentoTexto;
	private String usuarioAsignadoNombre;
	private EstadoTarea estado;
	private Instant creadoEn;
	private Instant completadoEn;
	private int diasAbierto;
	private boolean esParalelo;
	/** Hay más de una tarea con el mismo nodo de flujo en el trámite. */
	private boolean esIterativo;
	/** Ocurrencia 1-based entre tareas del mismo nodo (orden por creadoEn). */
	private int iterativoSecuencia;
	/** Etiqueta de arista (p. ej. Sí/No) si la tarea entró por una rama etiquetada. */
	private String decisionEtiqueta;
	private InformeResumenDTO informe;
}
