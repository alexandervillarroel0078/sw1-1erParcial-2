package com.dpn.backend.service;

import com.dpn.backend.dto.ClientePublicDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.mapper.EntityMapper;
import com.dpn.backend.model.Cliente;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClienteService {

	private final ClienteRepository clienteRepository;
	private final PasswordEncoder passwordEncoder;

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

	/**
	 * Nombre del cliente para persistir en tareas: snapshot del trámite o consulta por {@link Tramite#getClienteId()}.
	 */
	public String resolverNombreParaTarea(Tramite tramite) {
		if (tramite == null) {
			return "";
		}
		if (tramite.getClienteNombre() != null && !tramite.getClienteNombre().isBlank()) {
			return tramite.getClienteNombre().trim();
		}
		if (tramite.getClienteId() == null || tramite.getClienteId().isBlank()) {
			return "";
		}
		return clienteRepository.findById(tramite.getClienteId())
				.map(Cliente::getNombreCompleto)
				.filter(s -> s != null && !s.isBlank())
				.map(String::trim)
				.orElse("");
	}

	/**
	 * Listado para administración: DTO sin {@code passwordHash}.
	 */
	public List<ClientePublicDTO> listarTodosPublicos() {
		return clienteRepository.findAll().stream()
				.sorted(Comparator.comparing(Cliente::getCreadoEn, Comparator.nullsLast(Comparator.naturalOrder()))
						.reversed())
				.map(EntityMapper::toClientePublicDTO)
				.toList();
	}

	/**
	 * Para alta de trámite: busca por email; si no hay coincidencia, crea cliente con
	 * contraseña {@code cliente_}{@literal <teléfono>} (BCrypt).
	 */
	public Cliente obtenerOCrearParaTramite(String nombreCompleto, String telefono, String email) {
		String nombre = nombreCompleto != null ? nombreCompleto.trim() : "";
		String tel = telefono != null ? telefono.trim() : "";
		if (nombre.isEmpty() || tel.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Nombre completo y teléfono son obligatorios");
		}
		if (email != null && !email.isBlank()) {
			Optional<Cliente> existente = clienteRepository.findByEmailIgnoreCase(email.trim());
			if (existente.isPresent()) {
				return existente.get();
			}
		}
		String emailNorm = email != null && !email.isBlank() ? email.trim().toLowerCase() : null;
		String passwordPlano = "cliente_" + tel;
		Cliente c = Cliente.builder()
				.id(UUID.randomUUID().toString())
				.nombreCompleto(nombre)
				.telefono(tel)
				.email(emailNorm)
				.passwordHash(passwordEncoder.encode(passwordPlano))
				.activo(true)
				.creadoEn(Instant.now())
				.build();
		return clienteRepository.save(c);
	}
}
