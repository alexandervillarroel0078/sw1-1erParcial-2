package com.dpn.backend.politica.controller;

import com.dpn.backend.formulario.model.FormularioActividad;
import com.dpn.backend.politica.model.Politica;
import com.dpn.backend.formulario.service.FormularioActividadService;
import com.dpn.backend.politica.service.PoliticaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/politicas")
@RequiredArgsConstructor
public class PoliticaController {

	private final PoliticaService politicaService;
	private final FormularioActividadService formularioActividadService;

	@GetMapping
	public List<Politica> listar() {
		return politicaService.listar();
	}

	@GetMapping("/{id}")
	public Politica obtenerPorId(@PathVariable String id) {
		return politicaService.obtenerPorId(id);
	}

	@PostMapping
	public Politica crear(@Valid @RequestBody Politica body) {
		return politicaService.crear(body);
	}

	@PutMapping("/{id}")
	public Politica actualizar(@PathVariable String id, @RequestBody Politica body) {
		return politicaService.actualizar(id, body);
	}

	@PatchMapping("/{id}/activar-desactivar")
	public Politica activarDesactivar(@PathVariable String id) {
		return politicaService.activarDesactivar(id);
	}

	@DeleteMapping("/{id}")
	public void eliminar(@PathVariable String id) {
		politicaService.eliminar(id);
	}

	@GetMapping("/{politicaId}/nodos/{nodoId}/formulario")
	public ResponseEntity<FormularioActividad> obtenerFormulario(
			@PathVariable String politicaId,
			@PathVariable String nodoId) {
		return formularioActividadService.obtenerPorPoliticaYNodoOpcional(politicaId, nodoId)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}

	@PutMapping("/{politicaId}/nodos/{nodoId}/formulario")
	public FormularioActividad guardarFormulario(
			@PathVariable String politicaId,
			@PathVariable String nodoId,
			@RequestBody FormularioActividad body) {
		body.setPoliticaId(politicaId);
		body.setNodoActividadId(nodoId);
		return formularioActividadService.guardar(body);
	}

	@PostMapping("/{politicaId}/nodos/{nodoId}/formulario")
	@ResponseStatus(HttpStatus.CREATED)
	public FormularioActividad crearFormulario(
			@PathVariable String politicaId,
			@PathVariable String nodoId,
			@RequestBody FormularioActividad body) {
		body.setPoliticaId(politicaId);
		body.setNodoActividadId(nodoId);
		return formularioActividadService.guardar(body);
	}
}

/**
 * Ruta de funcionario: no puede vivir en el mismo {@link RequestMapping} que
 * {@link PoliticaController} (/api/admin/...), por eso es un bean aparte en este archivo.
 */
@RestController
@RequiredArgsConstructor
class FuncionarioPoliticaActivasEndpoint {

	private final PoliticaService politicaService;

	@GetMapping("/api/funcionario/politicas/activas")
	public ResponseEntity<List<Politica>> getPoliticasActivas() {
		return ResponseEntity.ok(politicaService.listarActivas());
	}
}
