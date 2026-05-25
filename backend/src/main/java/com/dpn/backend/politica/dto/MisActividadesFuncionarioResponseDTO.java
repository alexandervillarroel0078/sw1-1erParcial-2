package com.dpn.backend.politica.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Vista de catálogo para funcionario: nombre del departamento (cabecera UI) y
 * la lista pedida de políticas con actividades ({@link PoliticaActividadesFuncionarioDTO}).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MisActividadesFuncionarioResponseDTO {

	private String departamentoNombre;
	@Builder.Default
	private List<PoliticaActividadesFuncionarioDTO> politicas = new ArrayList<>();
}
