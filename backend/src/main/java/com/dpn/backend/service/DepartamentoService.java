package com.dpn.backend.service;

import com.dpn.backend.exception.ApiException;
import com.dpn.backend.model.Departamento;
import com.dpn.backend.repository.DepartamentoRepository;
import com.dpn.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepartamentoService {

	private final DepartamentoRepository departamentoRepository;
	private final UsuarioRepository usuarioRepository;

	public List<Departamento> listar() {
		return departamentoRepository.findAll();
	}

	public List<Departamento> listarActivos() {
		return departamentoRepository.findByActivoTrue();
	}

	public Departamento crear(Departamento d) {
		if (departamentoRepository.existsByNombreIgnoreCase(d.getNombre().trim())) {
			throw new ApiException(HttpStatus.CONFLICT, "Ya existe un departamento con ese nombre");
		}
		d.setId(UUID.randomUUID().toString());
		d.setNombre(d.getNombre().trim());
		return departamentoRepository.save(d);
	}

	public Departamento actualizar(String id, Departamento patch) {
		Departamento existing = departamentoRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Departamento no encontrado"));
		if (patch.getNombre() != null) {
			String nombre = patch.getNombre().trim();
			if (!nombre.equalsIgnoreCase(existing.getNombre())
					&& departamentoRepository.existsByNombreIgnoreCase(nombre)) {
				throw new ApiException(HttpStatus.CONFLICT, "Ya existe un departamento con ese nombre");
			}
			existing.setNombre(nombre);
		}
		return departamentoRepository.save(existing);
	}

	public void eliminar(String id) {
		if (usuarioRepository.existsByDepartamentoId(id)) {
			throw new ApiException(HttpStatus.CONFLICT, "No se puede eliminar: hay usuarios asignados a este departamento");
		}
		departamentoRepository.deleteById(id);
	}

	public Departamento activarDesactivar(String id) {
		Departamento d = departamentoRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Departamento no encontrado"));
		d.setActivo(!d.isActivo());
		return departamentoRepository.save(d);
	}
}
