package com.dpn.backend.controller;

import com.dpn.backend.dto.TramiteCreateDTO;
import com.dpn.backend.dto.TramiteDetalleAdminResponse;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.service.TareaService;
import com.dpn.backend.service.TramiteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TramiteController {

	private final TramiteService tramiteService;
	private final TareaService tareaService;

	@GetMapping("/api/admin/tramites")
	public List<Tramite> listarAdmin() {
		return tramiteService.listar();
	}

	@GetMapping("/api/admin/tramites/{id}/detalle")
	public TramiteDetalleAdminResponse detalleTramite(@PathVariable String id) {
		return tareaService.obtenerDetalleTramite(id);
	}

	@PostMapping("/api/funcionario/tramites")
	public Tramite crear(@Valid @RequestBody TramiteCreateDTO dto, Authentication authentication) {
		String userId = authentication != null ? authentication.getName() : null;
		return tramiteService.crear(dto, userId);
	}
}
