package com.dpn.backend.dto;

import com.dpn.backend.model.embedded.ArchivoAdjunto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InformeResumenDTO {

	private String descripcion;
	private String resultado;
	private Instant enviadoEn;
	@Builder.Default
	private List<ArchivoAdjunto> archivos = new ArrayList<>();
}
