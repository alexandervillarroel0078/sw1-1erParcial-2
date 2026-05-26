package com.dpn.backend.tarea.dto;

import com.dpn.backend.tarea.model.enums.EstadoTarea;
import com.dpn.backend.tramite.model.enums.EstadoTramite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TareaDTO {

	private String id;
	private String tramiteId;
	private String nodoFlujoId;
	private String actividadEtiqueta;
	private String departamentoTexto;
	private String politicaId;
	private String politicaNombre;
	private int pasoActual;
	private int totalPasos;
	private String clienteNombre;
	private String tramiteClienteId;
	private Integer diasAbierto;
	/** SLA del nodo ACTIVIDAD (minutos); solo en listados enriquecidos (p. ej. mis tareas). */
	private Integer slaMinutos;
	private String permisoDocumentos;
	/** Estado actual del trámite (p. ej. DEMORADO); solo en listados enriquecidos. */
	private EstadoTramite tramiteEstado;
	private String usuarioAsignadoId;
	private EstadoTarea estado;
	private Instant creadoEn;
	private Instant completadoEn;
	/** Solo en respuesta PATCH COMPLETAR cuando el flujo queda esperando rama. */
	private Boolean requiereDecision;
	private String condicionDecision;
	private List<OpcionDecisionDTO> opcionesDecision;
}
