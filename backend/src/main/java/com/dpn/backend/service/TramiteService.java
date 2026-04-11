package com.dpn.backend.service;

import com.dpn.backend.dto.TramiteCreateDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.model.Cliente;
import com.dpn.backend.model.Politica;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.model.enums.EstadoTramite;
import com.dpn.backend.repository.PoliticaRepository;
import com.dpn.backend.repository.TramiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TramiteService {

	private final TramiteRepository tramiteRepository;
	private final PoliticaRepository politicaRepository;
	private final ClienteService clienteService;
	private final WorkflowEngine workflowEngine;

	public List<Tramite> listar() {
		return tramiteRepository.findAll();
	}

	public Tramite crear(TramiteCreateDTO dto, String creadoPorUsuarioId) {
		Politica p = politicaRepository.findById(dto.getPoliticaId())
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Política no encontrada"));
		if (!p.isActiva()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "La política no está activa");
		}
		Cliente cliente = clienteService.obtenerOCrearParaTramite(
				dto.getClienteNombreCompleto(),
				dto.getClienteTelefono(),
				dto.getClienteEmail());

		Tramite t = Tramite.builder()
				.id(UUID.randomUUID().toString())
				.politicaId(p.getId())
				.politicaNombre(p.getNombre())
				.clienteId(cliente.getId())
				.clienteNombre(cliente.getNombreCompleto())
				.creadoPorUsuarioId(creadoPorUsuarioId)
				.estado(EstadoTramite.INICIADO)
				.creadoEn(Instant.now())
				.actualizadoEn(Instant.now())
				.build();
		tramiteRepository.save(t);
		workflowEngine.iniciarTramite(t);
		return tramiteRepository.findById(t.getId()).orElse(t);
	}

	public Tramite obtenerPorId(String id) {
		return tramiteRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
	}
}
