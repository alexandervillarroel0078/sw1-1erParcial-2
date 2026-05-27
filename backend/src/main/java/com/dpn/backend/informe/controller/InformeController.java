package com.dpn.backend.informe.controller;

import com.dpn.backend.informe.dto.InformeCreateDTO;
import com.dpn.backend.informe.model.Informe;
import com.dpn.backend.informe.service.InformeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/funcionario/informes")
@RequiredArgsConstructor
public class InformeController {

	private final InformeService informeService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public Informe crear(@Valid @RequestBody InformeCreateDTO dto, Authentication authentication) {
		String funcionarioId = authentication.getName();
		return informeService.crear(dto, funcionarioId, funcionarioId);
	}

	@GetMapping("/tarea/{tareaId}")
	public Informe obtenerPorTarea(
			@PathVariable String tareaId,
			Authentication authentication) {
		return informeService.obtenerPorTareaId(tareaId, authentication.getName());
	}
}
