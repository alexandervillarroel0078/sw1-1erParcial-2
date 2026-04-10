package com.dpn.backend.service;

import com.dpn.backend.exception.ApiException;
import com.dpn.backend.model.Politica;
import com.dpn.backend.repository.PoliticaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PoliticaService {

	private final PoliticaRepository politicaRepository;

	public List<Politica> listar() {
		return politicaRepository.findAllByOrderByFechaCreacionDesc();
	}

	public Politica obtenerPorId(String id) {
		return politicaRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Política no encontrada"));
	}

	public Politica crear(Politica p) {
		p.setId(UUID.randomUUID().toString());
		if (p.getFechaCreacion() == null) {
			p.setFechaCreacion(Instant.now());
		}
		return politicaRepository.save(p);
	}

	public Politica actualizar(String id, Politica patch) {
		Politica existing = obtenerPorId(id);
		if (patch.getNombre() != null) {
			existing.setNombre(patch.getNombre());
		}
		if (patch.getSubtitulo() != null) {
			existing.setSubtitulo(patch.getSubtitulo());
		}
		if (patch.getColorTema() != null) {
			existing.setColorTema(patch.getColorTema());
		}
		if (patch.getOrientacionCalles() != null) {
			existing.setOrientacionCalles(patch.getOrientacionCalles());
		}
		if (patch.getNodos() != null) {
			existing.setNodos(patch.getNodos());
		}
		if (patch.getAristas() != null) {
			existing.setAristas(patch.getAristas());
		}
		if (patch.getCallesDiseno() != null) {
			existing.setCallesDiseno(patch.getCallesDiseno());
		}
		return politicaRepository.save(existing);
	}

	public void eliminar(String id) {
		politicaRepository.deleteById(id);
	}

	public Politica activarDesactivar(String id) {
		Politica p = obtenerPorId(id);
		p.setActiva(!p.isActiva());
		return politicaRepository.save(p);
	}
}
