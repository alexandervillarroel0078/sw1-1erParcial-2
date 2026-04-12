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
	private boolean esIterativo;
	private int iterativoSecuencia;
	private String decisionEtiqueta;
	/** Tipo del nodo de flujo en la política (p. ej. ACTIVIDAD, DECISION). */
	private String tipoNodo;
	private InformeResumenDTO informe;
}
