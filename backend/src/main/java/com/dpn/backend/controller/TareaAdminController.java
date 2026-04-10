package com.dpn.backend.controller;

import com.dpn.backend.dto.TareaDTO;
import com.dpn.backend.service.TareaService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tareas")
@RequiredArgsConstructor
public class TareaAdminController {

	private final TareaService tareaService;

	@GetMapping
	public List<TareaDTO> listar() {
		return tareaService.listarTodas();
	}
}
