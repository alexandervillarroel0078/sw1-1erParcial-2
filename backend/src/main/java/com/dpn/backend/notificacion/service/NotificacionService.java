package com.dpn.backend.notificacion.service;

import com.dpn.backend.exception.ApiException;
import com.dpn.backend.notificacion.model.Notificacion;
import com.dpn.backend.notificacion.repository.NotificacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificacionService {

	private final NotificacionRepository notificacionRepository;
	private final SimpMessagingTemplate messagingTemplate;

	/**
	 * Persiste notificación y dispara envío push.
	 * TODO: integrar Firebase Cloud Messaging usando {@code tokenFcm} del cliente.
	 */
	public Notificacion enviar(String clienteId, String tramiteId, String titulo, String mensaje) {
		Notificacion n = Notificacion.builder()
				.id(UUID.randomUUID().toString())
				.clienteId(clienteId)
				.tramiteId(tramiteId)
				.titulo(titulo)
				.mensaje(mensaje)
				.leida(false)
				.enviadoEn(Instant.now())
				.build();
		n = notificacionRepository.save(n);
		messagingTemplate.convertAndSend("/topic/cliente/" + clienteId + "/notificaciones", n);
		// TODO: Firebase — enviar mensaje al dispositivo del cliente (token FCM).
		return n;
	}

	public Notificacion marcarLeida(String id, String clienteId) {
		Notificacion n = notificacionRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notificación no encontrada"));
		if (!clienteId.equals(n.getClienteId())) {
			throw new ApiException(HttpStatus.FORBIDDEN, "No autorizado");
		}
		n.setLeida(true);
		return notificacionRepository.save(n);
	}

	public List<Notificacion> listarPorCliente(String clienteId) {
		return notificacionRepository.findByClienteIdOrderByEnviadoEnDesc(clienteId);
	}

	public List<Notificacion> listarNoLeidas(String clienteId) {
		return notificacionRepository.findByClienteIdAndLeidaFalse(clienteId);
	}
}
