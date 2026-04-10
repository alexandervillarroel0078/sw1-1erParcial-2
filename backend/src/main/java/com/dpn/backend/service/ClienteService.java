package com.dpn.backend.service;

import com.dpn.backend.exception.ApiException;
import com.dpn.backend.model.Cliente;
import com.dpn.backend.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClienteService {

	private final ClienteRepository clienteRepository;

	/**
	 * Crea cliente si no existe por email; opcionalmente actualiza datos básicos.
	 */
	public Cliente crearObtener(String nombreCompleto, String telefono, String email) {
		if (email != null && !email.isBlank()) {
			Optional<Cliente> opt = clienteRepository.findByEmailIgnoreCase(email.trim());
			if (opt.isPresent()) {
				return opt.get();
			}
		}
		Cliente c = Cliente.builder()
				.id(UUID.randomUUID().toString())
				.nombreCompleto(nombreCompleto != null ? nombreCompleto.trim() : "")
				.telefono(telefono != null ? telefono.trim() : "")
				.email(email != null ? email.trim().toLowerCase() : null)
				.passwordHash(null)
				.activo(true)
				.creadoEn(Instant.now())
				.build();
		return clienteRepository.save(c);
	}

	public Optional<Cliente> buscarPorEmail(String email) {
		if (email == null || email.isBlank()) {
			return Optional.empty();
		}
		return clienteRepository.findByEmailIgnoreCase(email.trim());
	}

	public Cliente obtenerPorId(String id) {
		return clienteRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));
	}
}
