package com.dpn.backend.tramite.service;

import com.dpn.backend.tramite.dto.TramiteCreateDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.cliente.model.Cliente;
import com.dpn.backend.politica.model.Politica;
import com.dpn.backend.tramite.model.Tramite;
import com.dpn.backend.tramite.model.enums.EstadoTramite;
import com.dpn.backend.politica.repository.PoliticaRepository;
import com.dpn.backend.tramite.repository.TramiteRepository;
import com.dpn.backend.cliente.service.ClienteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TramiteService {

	private final TramiteRepository tramiteRepository;
	private final PoliticaRepository politicaRepository;
	private final ClienteService clienteService;
	private final WorkflowEngine workflowEngine;

	public List<Tramite> listar() {
		List<Tramite> list = tramiteRepository.findAll();
		for (Tramite t : list) {
			t.setPorcentajeAvance(calcularPorcentajeAvance(t));
		}
		return list;
	}

	/**
	 * Porcentaje de avance alineado al monitor: 100% si el trámite está completado;
	 * si no, {@code pasoActual} cuenta actividades ACTIVIDAD ya completadas sobre {@code totalPasos}.
	 */
	public static int calcularPorcentajeAvance(Tramite t) {
		if (t.getEstado() == EstadoTramite.COMPLETADO) {
			return 100;
		}
		Integer total = t.getTotalPasos();
		if (total == null || total <= 0) {
			return 0;
		}
		int paso = t.getPasoActual() != null ? t.getPasoActual() : 0;
		return Math.min(100, (int) Math.round((paso * 100.0) / total));
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

		int totalPasosActividad = WorkflowEngine.contarNodosActividad(p);

		Tramite t = Tramite.builder()
				.id(UUID.randomUUID().toString())
				.politicaId(p.getId())
				.politicaNombre(p.getNombre())
				.clienteId(cliente.getId())
				.clienteNombre(cliente.getNombreCompleto())
				.creadoPorUsuarioId(creadoPorUsuarioId)
				.estado(EstadoTramite.INICIADO)
				.totalPasos(totalPasosActividad)
				.pasoActual(0)
				.creadoEn(Instant.now())
				.actualizadoEn(Instant.now())
				.build();
		tramiteRepository.save(t);
		log.info("[TRAMITE] Nuevo trámite creado tramiteId={} politicaId={} clienteId={}", t.getId(), t.getPoliticaId(), t.getClienteId());
		workflowEngine.iniciarTramite(t);
		return tramiteRepository.findById(t.getId()).orElse(t);
	}

	public Tramite obtenerPorId(String id) {
		return tramiteRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trámite no encontrado"));
	}
}
