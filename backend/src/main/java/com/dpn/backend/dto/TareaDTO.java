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
public class TareaDTO {

	private String id;
	private String tramiteId;
	private String nodoFlujoId;
	private String actividadEtiqueta;
	private String departamentoTexto;
	private String politicaNombre;
	private int pasoActual;
	private int totalPasos;
	private String clienteNombre;
	private Integer diasAbierto;
	private String usuarioAsignadoId;
	private EstadoTarea estado;
	private Instant creadoEn;
	private Instant completadoEn;
}
