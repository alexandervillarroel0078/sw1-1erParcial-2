package com.dpn.backend.cliente.dto;

import com.dpn.backend.tramite.model.enums.EstadoTramite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Vista reducida de un trámite para el portal cliente (listado).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteTramiteResumenDTO {

	private String id;
	private String politicaNombre;
	private EstadoTramite estado;
	private Instant creadoEn;
	private Integer pasoActual;
	private Integer totalPasos;
}
