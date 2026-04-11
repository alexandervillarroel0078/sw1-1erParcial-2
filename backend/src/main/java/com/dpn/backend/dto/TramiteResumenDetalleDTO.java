package com.dpn.backend.dto;

import com.dpn.backend.model.enums.EstadoTramite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TramiteResumenDetalleDTO {

	private String id;
	private String politicaNombre;
	private String clienteNombre;
	private EstadoTramite estado;
	private Instant creadoEn;
	private Integer pasoActual;
	private Integer totalPasos;
	/** Indica si la política define flujo paralelo (FORK), según el trámite. */
	private Boolean esFlujoParalelo;
	/** Si alguna actividad del trámite repite el mismo nodo de flujo. */
	private boolean tieneActividadIterativa;
}
