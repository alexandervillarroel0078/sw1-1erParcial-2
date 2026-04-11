package com.dpn.backend.service;

import com.dpn.backend.model.Politica;
import com.dpn.backend.model.Tarea;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.model.embedded.NodoPolitica;
import com.dpn.backend.model.enums.EstadoTarea;
import com.dpn.backend.model.enums.EstadoTramite;
import com.dpn.backend.repository.PoliticaRepository;
import com.dpn.backend.repository.TareaRepository;
import com.dpn.backend.repository.TramiteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Marca tareas y trámites en {@link EstadoTarea#DEMORADO} / {@link EstadoTramite#DEMORADO}
 * cuando se supera el SLA del nodo de política (solo marca; no cancela ni elimina).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SlaMonitorService {

	private final TareaRepository tareaRepository;
	private final TramiteRepository tramiteRepository;
	private final PoliticaRepository politicaRepository;

	@Scheduled(fixedRate = 60_000)
	public void verificarTareasVencidas() {
		List<Tarea> candidatas = tareaRepository.findByEstadoIn(
				List.of(EstadoTarea.PENDIENTE, EstadoTarea.EN_ATENCION));
		int vencidas = 0;
		Map<String, Politica> politicasCache = new HashMap<>();

		for (Tarea tarea : candidatas) {
			if (marcarSiVencida(tarea, politicasCache)) {
				vencidas++;
			}
		}

		log.info("SLA Monitor: {} tareas vencidas", vencidas);
	}

	/**
	 * @return {@code true} si la tarea pasó a DEMORADO en esta ejecución
	 */
	private boolean marcarSiVencida(Tarea tarea, Map<String, Politica> politicasCache) {
		if (tarea.getNodoFlujoId() == null || tarea.getNodoFlujoId().isBlank()) {
			return false;
		}
		if (tarea.getCreadoEn() == null) {
			return false;
		}

		Optional<Tramite> tramiteOpt = tramiteRepository.findById(tarea.getTramiteId());
		if (tramiteOpt.isEmpty()) {
			return false;
		}
		Tramite tramite = tramiteOpt.get();
		if (tramite.getEstado() == EstadoTramite.CANCELADO
				|| tramite.getEstado() == EstadoTramite.COMPLETADO) {
			return false;
		}

		Politica politica = politicasCache.computeIfAbsent(
				tramite.getPoliticaId(),
				id -> politicaRepository.findById(id).orElse(null));
		if (politica == null) {
			return false;
		}

		Optional<NodoPolitica> nodoOpt = politica.getNodos() == null
				? Optional.empty()
				: politica.getNodos().stream()
						.filter(n -> tarea.getNodoFlujoId().equals(n.getId()))
						.findFirst();
		if (nodoOpt.isEmpty()) {
			return false;
		}

		Integer slaHoras = nodoOpt.get().getSlaHoras();
		if (slaHoras == null || slaHoras <= 0) {
			return false;
		}

		Instant limite = tarea.getCreadoEn().plus(slaHoras.longValue(), ChronoUnit.HOURS);
		if (!Instant.now().isAfter(limite)) {
			return false;
		}

		tarea.setEstado(EstadoTarea.DEMORADO);
		tareaRepository.save(tarea);

		tramite.setEstado(EstadoTramite.DEMORADO);
		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);

		return true;
	}
}
