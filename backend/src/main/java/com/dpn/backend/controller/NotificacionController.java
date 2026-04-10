package com.dpn.backend.controller;

import com.dpn.backend.model.Notificacion;
import com.dpn.backend.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cliente/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

	private final NotificacionService notificacionService;

	@GetMapping
	public List<Notificacion> listar(Authentication authentication) {
		return notificacionService.listarPorCliente(authentication.getName());
	}

	@PatchMapping("/{id}/leida")
	public Notificacion marcarLeida(@PathVariable String id, Authentication authentication) {
		return notificacionService.marcarLeida(id, authentication.getName());
	}
}
