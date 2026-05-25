package com.dpn.backend.cliente.controller;

import com.dpn.backend.cliente.dto.ClienteTramiteResumenDTO;
import com.dpn.backend.tramite.dto.TramiteDetalleAdminResponse;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.notificacion.model.Notificacion;
import com.dpn.backend.tramite.model.Tramite;
import com.dpn.backend.tramite.repository.TramiteRepository;
import com.dpn.backend.notificacion.service.NotificacionService;
import com.dpn.backend.tarea.service.TareaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * API del portal cliente: trámites y notificaciones bajo {@code /api/cliente}.
 */
@RestController
@RequestMapping("/api/cliente")
@RequiredArgsConstructor
public class ClienteTramiteController {

	private final TramiteRepository tramiteRepository;
	private final TareaService tareaService;
	private final NotificacionService notificacionService;

	/**
	 * Lista trámites del cliente autenticado (JWT → {@link Authentication#getName()} = clienteId).
	 */
	@GetMapping("/tramites")
	public List<ClienteTramiteResumenDTO> listarTramites(Authentication authentication) {
		String clienteId = authentication.getName();
		return tramiteRepository.findByClienteId(clienteId).stream()
				.map(this::toResumen)
				.collect(Collectors.toList());
	}

	private ClienteTramiteResumenDTO toResumen(Tramite t) {
		return ClienteTramiteResumenDTO.builder()
				.id(t.getId())
				.politicaNombre(t.getPoliticaNombre())
				.estado(t.getEstado())
				.creadoEn(t.getCreadoEn())
				.pasoActual(t.getPasoActual())
				.totalPasos(t.getTotalPasos())
				.build();
	}

	/**
	 * Detalle con timeline de actividades; solo si el trámite pertenece al cliente.
	 */
	@GetMapping("/tramites/{id}/detalle")
	public TramiteDetalleAdminResponse detalleTramite(
			@PathVariable String id,
			Authentication authentication) {
		Tramite t = tramiteRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
		if (t.getClienteId() == null || !t.getClienteId().equals(authentication.getName())) {
			throw new ApiException(HttpStatus.FORBIDDEN, "No autorizado");
		}
		return tareaService.obtenerDetalleTramite(id);
	}

	/**
	 * Notificaciones del cliente, ordenadas por {@code enviadoEn} descendente.
	 */
	@GetMapping("/notificaciones")
	public List<Notificacion> listarNotificaciones(Authentication authentication) {
		return notificacionService.listarPorCliente(authentication.getName());
	}

	@PatchMapping("/notificaciones/{id}/leida")
	public Notificacion marcarNotificacionLeida(
			@PathVariable String id,
			Authentication authentication) {
		return notificacionService.marcarLeida(id, authentication.getName());
	}
}
