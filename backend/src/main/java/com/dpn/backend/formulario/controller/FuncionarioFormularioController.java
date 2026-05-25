package com.dpn.backend.formulario.controller;

import com.dpn.backend.formulario.model.FormularioActividad;
import com.dpn.backend.formulario.service.FormularioActividadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/funcionario/formulario")
@RequiredArgsConstructor
public class FuncionarioFormularioController {

	private final FormularioActividadService formularioActividadService;

	@GetMapping
	public ResponseEntity<FormularioActividad> obtener(
			@RequestParam String politicaId,
			@RequestParam String nodoId) {
		return formularioActividadService.obtenerPorPoliticaYNodoOpcional(politicaId, nodoId)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}
}
