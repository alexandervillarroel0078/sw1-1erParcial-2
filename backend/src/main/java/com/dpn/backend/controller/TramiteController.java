package com.dpn.backend.controller;

import com.dpn.backend.dto.TramiteCreateDTO;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.service.TramiteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TramiteController {

	private final TramiteService tramiteService;

	@GetMapping("/api/admin/tramites")
	public List<Tramite> listarAdmin() {
		return tramiteService.listar();
	}

	@PostMapping("/api/funcionario/tramites")
	public Tramite crear(@Valid @RequestBody TramiteCreateDTO dto, Authentication authentication) {
		String userId = authentication != null ? authentication.getName() : null;
		return tramiteService.crear(dto, userId);
	}
}
