package com.dpn.backend.usuario.service;

import com.dpn.backend.usuario.dto.UsuarioUpdateRequest;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.usuario.model.Usuario;
import com.dpn.backend.auth.model.enums.RolUsuario;
import com.dpn.backend.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UsuarioService {

	private final UsuarioRepository usuarioRepository;
	private final PasswordEncoder passwordEncoder;

	public List<Usuario> listar() {
		return usuarioRepository.findAll();
	}

	public List<Usuario> listarFuncionarios() {
		return usuarioRepository.findAll().stream()
				.filter(u -> u.getRol() == RolUsuario.FUNCIONARIO)
				.toList();
	}

	public Usuario crear(Usuario u, String passwordPlano) {
		if (usuarioRepository.findByCorreoIgnoreCase(u.getCorreo().trim()).isPresent()) {
			throw new ApiException(HttpStatus.CONFLICT, "El correo ya está registrado");
		}
		if (u.getRol() == RolUsuario.FUNCIONARIO
				&& (u.getDepartamentoId() == null || u.getDepartamentoId().isBlank())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "El funcionario debe tener departamento");
		}
		u.setId(UUID.randomUUID().toString());
		u.setCorreo(u.getCorreo().trim().toLowerCase());
		u.setNombre(u.getNombre().trim());
		u.setPasswordHash(passwordEncoder.encode(passwordPlano));
		u.setCreadoEn(Instant.now());
		return usuarioRepository.save(u);
	}

	public Usuario actualizar(String id, UsuarioUpdateRequest req) {
		Usuario existing = usuarioRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
		if (req.getNombre() != null) {
			existing.setNombre(req.getNombre().trim());
		}
		if (req.getCorreo() != null && !req.getCorreo().equalsIgnoreCase(existing.getCorreo())) {
			if (usuarioRepository.findByCorreoIgnoreCase(req.getCorreo().trim()).isPresent()) {
				throw new ApiException(HttpStatus.CONFLICT, "El correo ya está en uso");
			}
			existing.setCorreo(req.getCorreo().trim().toLowerCase());
		}
		if (req.getRol() != null) {
			existing.setRol(req.getRol());
		}
		if (req.getDepartamentoId() != null) {
			existing.setDepartamentoId(req.getDepartamentoId().isBlank() ? null : req.getDepartamentoId());
		}
		if (req.getActivo() != null) {
			existing.setActivo(req.getActivo());
		}
		if (req.getPassword() != null && !req.getPassword().isBlank()) {
			existing.setPasswordHash(passwordEncoder.encode(req.getPassword()));
		}
		if (existing.getRol() == RolUsuario.FUNCIONARIO
				&& (existing.getDepartamentoId() == null || existing.getDepartamentoId().isBlank())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "El funcionario debe tener departamento");
		}
		return usuarioRepository.save(existing);
	}

	public void eliminar(String id) {
		usuarioRepository.deleteById(id);
	}

	public Usuario obtenerPorId(String id) {
		return usuarioRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
	}
}
