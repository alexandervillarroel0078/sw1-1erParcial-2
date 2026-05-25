package com.dpn.backend.tarea.controller;

import com.dpn.backend.tarea.dto.TareaAccionRequest;
import com.dpn.backend.tarea.dto.TareaDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.tarea.service.TareaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/funcionario/tareas")
@RequiredArgsConstructor
public class TareaController {

	private final TareaService tareaService;

	@GetMapping("/mias")
	public List<TareaDTO> listarMias(Authentication authentication) {
		return tareaService.listarMisTareas(authentication.getName());
	}

	@GetMapping("/{id}")
	public TareaDTO obtener(@PathVariable String id, Authentication authentication) {
		return tareaService.obtenerPorId(id, authentication.getName());
	}

	@PatchMapping("/{id}")
	public TareaDTO accion(
			@PathVariable String id,
			@Valid @RequestBody TareaAccionRequest req,
			Authentication authentication) {
		String accion = req.getAccion() != null ? req.getAccion().trim().toUpperCase() : "";
		return switch (accion) {
			case "ATENDER" -> tareaService.atender(id, authentication.getName());
			case "COMPLETAR" -> tareaService.completar(id, authentication.getName(), req);
			case "DECIDIR" -> tareaService.decidir(id, authentication.getName(), req);
			default -> throw new ApiException(HttpStatus.BAD_REQUEST,
					"Acción no válida: use ATENDER, COMPLETAR o DECIDIR");
		};
	}
}
