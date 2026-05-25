package com.dpn.backend.auth.service;

import com.dpn.backend.auth.dto.LoginRequest;
import com.dpn.backend.auth.dto.LoginResponse;
import com.dpn.backend.auth.dto.RegistroClienteRequest;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.mapper.EntityMapper;
import com.dpn.backend.cliente.model.Cliente;
import com.dpn.backend.usuario.model.Usuario;
import com.dpn.backend.cliente.repository.ClienteRepository;
import com.dpn.backend.usuario.repository.UsuarioRepository;
import com.dpn.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final UsuarioRepository usuarioRepository;
	private final ClienteRepository clienteRepository;
	private final JwtUtil jwtUtil;
	private final PasswordEncoder passwordEncoder;

	public LoginResponse login(LoginRequest req) {
		var usuarioOpt = usuarioRepository.findByCorreoIgnoreCase(req.getCorreo().trim());
		if (usuarioOpt.isPresent()) {
			Usuario u = usuarioOpt.get();
			if (!u.isActivo()) {
				throw new ApiException(HttpStatus.UNAUTHORIZED, "Usuario inactivo");
			}
			if (!passwordEncoder.matches(req.getPassword(), u.getPasswordHash())) {
				throw new ApiException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
			}
			String token = jwtUtil.generateToken(u.getId(), Map.of(JwtUtil.CLAIM_ROLES, List.of(u.getRol().name())));
			return LoginResponse.builder()
					.token(token)
					.usuario(EntityMapper.toUsuarioDTO(u))
					.cliente(null)
					.build();
		}

		var clienteOpt = clienteRepository.findByEmailIgnoreCase(req.getCorreo().trim());
		if (clienteOpt.isPresent()) {
			Cliente c = clienteOpt.get();
			if (!c.isActivo()) {
				throw new ApiException(HttpStatus.UNAUTHORIZED, "Cliente inactivo");
			}
			if (c.getPasswordHash() == null || !passwordEncoder.matches(req.getPassword(), c.getPasswordHash())) {
				throw new ApiException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
			}
			String token = jwtUtil.generateToken(c.getId(), Map.of(JwtUtil.CLAIM_ROLES, List.of("CLIENTE")));
			return LoginResponse.builder()
					.token(token)
					.usuario(null)
					.cliente(EntityMapper.toClientePublicDTO(c))
					.build();
		}

		throw new ApiException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
	}

	public LoginResponse registroCliente(RegistroClienteRequest req) {
		if (clienteRepository.findByEmailIgnoreCase(req.getEmail().trim()).isPresent()) {
			throw new ApiException(HttpStatus.CONFLICT, "El email ya está registrado");
		}
		Cliente c = Cliente.builder()
				.id(UUID.randomUUID().toString())
				.nombreCompleto(req.getNombreCompleto().trim())
				.telefono(req.getTelefono().trim())
				.email(req.getEmail().trim().toLowerCase())
				.passwordHash(passwordEncoder.encode(req.getPassword()))
				.tokenFcm(req.getTokenFcm())
				.activo(true)
				.creadoEn(Instant.now())
				.build();
		clienteRepository.save(c);
		String token = jwtUtil.generateToken(c.getId(), Map.of(JwtUtil.CLAIM_ROLES, List.of("CLIENTE")));
		return LoginResponse.builder()
				.token(token)
				.usuario(null)
				.cliente(EntityMapper.toClientePublicDTO(c))
				.build();
	}
}
