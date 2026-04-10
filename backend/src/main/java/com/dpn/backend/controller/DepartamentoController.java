package com.dpn.backend.controller;

import com.dpn.backend.model.Departamento;
import com.dpn.backend.service.DepartamentoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/departamentos")
@RequiredArgsConstructor
public class DepartamentoController {

	private final DepartamentoService departamentoService;

	@GetMapping
	public List<Departamento> listar() {
		return departamentoService.listar();
	}

	@PostMapping
	public Departamento crear(@Valid @RequestBody Departamento body) {
		return departamentoService.crear(body);
	}

	@PutMapping("/{id}")
	public Departamento actualizar(@PathVariable String id, @RequestBody Departamento body) {
		return departamentoService.actualizar(id, body);
	}

	@PatchMapping("/{id}/activar-desactivar")
	public Departamento activarDesactivar(@PathVariable String id) {
		return departamentoService.activarDesactivar(id);
	}

	@DeleteMapping("/{id}")
	public void eliminar(@PathVariable String id) {
		departamentoService.eliminar(id);
	}
}
