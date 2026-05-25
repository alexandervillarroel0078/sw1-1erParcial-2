package com.dpn.backend.politica.dto;

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
public class PoliticaActividadesFuncionarioDTO {

	private String politicaNombre;
	@Builder.Default
	private List<ActividadCatalogoDTO> actividades = new ArrayList<>();
}
