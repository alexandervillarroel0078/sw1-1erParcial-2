package com.dpn.backend.informe.dto;

import com.dpn.backend.archivo.model.embedded.ArchivoAdjunto;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InformeCreateDTO {

	@NotBlank
	private String tramiteId;
	/** Solo en informes finales (no borrador), para consulta GET por tarea. */
	private String tareaId;
	private String nodoActividadId;
	@NotBlank
	private String descripcion;
	@NotBlank
	private String resultado;
	private String observaciones;
	@Builder.Default
	private List<ArchivoAdjunto> archivos = new ArrayList<>();
	private boolean esBorrador;
}
