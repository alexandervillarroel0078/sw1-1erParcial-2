package com.dpn.backend.controller;

import com.dpn.backend.dto.MisActividadesFuncionarioResponseDTO;
import com.dpn.backend.dto.UsuarioCreateRequest;
import com.dpn.backend.dto.UsuarioDTO;
import com.dpn.backend.dto.UsuarioUpdateRequest;
import com.dpn.backend.mapper.EntityMapper;
import com.dpn.backend.model.Usuario;
import com.dpn.backend.service.FuncionarioMisActividadesService;
import com.dpn.backend.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

	private final UsuarioService usuarioService;

	@GetMapping
	public List<UsuarioDTO> listar() {
		return usuarioService.listar().stream().map(EntityMapper::toUsuarioDTO).toList();
	}

	@GetMapping("/funcionarios")
	public List<UsuarioDTO> listarFuncionarios() {
		return usuarioService.listarFuncionarios().stream().map(EntityMapper::toUsuarioDTO).toList();
	}

	@PostMapping
	public UsuarioDTO crear(@Valid @RequestBody UsuarioCreateRequest req) {
		Usuario u = Usuario.builder()
				.nombre(req.getNombre())
				.correo(req.getCorreo())
				.rol(req.getRol())
				.departamentoId(req.getDepartamentoId())
				.activo(req.isActivo())
				.build();
		return EntityMapper.toUsuarioDTO(usuarioService.crear(u, req.getPassword()));
	}

	@PutMapping("/{id}")
	public UsuarioDTO actualizar(@PathVariable String id, @RequestBody UsuarioUpdateRequest req) {
		return EntityMapper.toUsuarioDTO(usuarioService.actualizar(id, req));
	}

	@DeleteMapping("/{id}")
	public void eliminar(@PathVariable String id) {
		usuarioService.eliminar(id);
	}
}

/**
 * Rutas de funcionario: no pueden compartir {@code @RequestMapping} con
 * {@link UsuarioController} ({@code /api/admin/...}), por eso este bean aparte en el mismo archivo.
 */
@RestController
@RequiredArgsConstructor
class FuncionarioMisActividadesController {

	private final FuncionarioMisActividadesService funcionarioMisActividadesService;

	@GetMapping("/api/funcionario/mis-actividades")
	public MisActividadesFuncionarioResponseDTO misActividades(Authentication authentication) {
		return funcionarioMisActividadesService.listarPorUsuarioAutenticado(authentication.getName());
	}
}
