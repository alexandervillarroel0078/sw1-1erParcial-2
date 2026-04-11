package com.dpn.backend.service;

import com.dpn.backend.dto.AnalisisNodoDetalleDTO;
import com.dpn.backend.dto.AnalisisPoliticaMetricasDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.model.Politica;
import com.dpn.backend.model.Tarea;
import com.dpn.backend.model.Tramite;
import com.dpn.backend.model.embedded.NodoPolitica;
import com.dpn.backend.model.enums.EstadoAnalisisNodo;
import com.dpn.backend.model.enums.EstadoTarea;
import com.dpn.backend.repository.PoliticaRepository;
import com.dpn.backend.repository.TareaRepository;
import com.dpn.backend.repository.TramiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalisisService {

	private static final double MS_POR_DIA = 86_400_000.0;

	private final PoliticaRepository politicaRepository;
	private final TramiteRepository tramiteRepository;
	private final TareaRepository tareaRepository;

	public AnalisisPoliticaMetricasDTO calcularMetricas(String politicaId) {
		Politica politica = politicaRepository.findById(politicaId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Política no encontrada"));

		List<Tramite> tramites = tramiteRepository.findByPoliticaId(politicaId);
		if (tramites.isEmpty()) {
			return vacio(politicaId);
		}
		Set<String> tramiteIds = tramites.stream().map(Tramite::getId).filter(Objects::nonNull).collect(Collectors.toSet());
		List<Tarea> tareas = tareaRepository.findByTramiteIdInAndEstado(tramiteIds, EstadoTarea.COMPLETADO);

		Map<String, NodoPolitica> nodoPorId = politica.getNodos().stream()
				.filter(n -> n.getId() != null)
				.collect(Collectors.toMap(NodoPolitica::getId, n -> n, (a, b) -> a));

		Map<String, List<Double>> duracionesPorNodo = new HashMap<>();
		Set<String> tramitesConTareaValida = new HashSet<>();
		List<Double> todasLasDuraciones = new ArrayList<>();

		for (Tarea t : tareas) {
			if (t.getNodoFlujoId() == null || t.getNodoFlujoId().isBlank()) {
				continue;
			}
			if (t.getCreadoEn() == null || t.getCompletadoEn() == null) {
				continue;
			}
			if (t.getCompletadoEn().isBefore(t.getCreadoEn())) {
				continue;
			}
			double dias = Duration.between(t.getCreadoEn(), t.getCompletadoEn()).toMillis() / MS_POR_DIA;
			duracionesPorNodo.computeIfAbsent(t.getNodoFlujoId(), k -> new ArrayList<>()).add(dias);
			if (t.getTramiteId() != null) {
				tramitesConTareaValida.add(t.getTramiteId());
			}
			todasLasDuraciones.add(dias);
		}

		if (duracionesPorNodo.isEmpty()) {
			return AnalisisPoliticaMetricasDTO.builder()
					.politicaId(politicaId)
					.tramitesAnalizados(0)
					.tiempoPromedioTotal(0.0)
					.nodoCriticoId(null)
					.nodoCriticoEtiqueta("—")
					.nodoCriticoPromedio(0.0)
					.detalleNodos(List.of())
					.build();
		}

		List<AnalisisNodoDetalleDTO> detalle = new ArrayList<>();
		for (Map.Entry<String, List<Double>> e : duracionesPorNodo.entrySet()) {
			String nodoId = e.getKey();
			List<Double> vals = e.getValue();
			double promedio = vals.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
			NodoPolitica np = nodoPorId.get(nodoId);
			String etiqueta = etiquetaNodo(np, nodoId, tareas);
			String departamento = departamentoNodo(np, nodoId, tareas);
			detalle.add(AnalisisNodoDetalleDTO.builder()
					.nodoId(nodoId)
					.etiqueta(etiqueta)
					.departamento(departamento)
					.tiempoPromedio(promedio)
					.cantidadTareas(vals.size())
					.estado(estadoDesdeDiasPromedio(promedio))
					.build());
		}

		detalle.sort(Comparator.comparingDouble(AnalisisNodoDetalleDTO::getTiempoPromedio).reversed());

		AnalisisNodoDetalleDTO critico = detalle.get(0);
		double tiempoPromedioTotal = todasLasDuraciones.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

		return AnalisisPoliticaMetricasDTO.builder()
				.politicaId(politicaId)
				.tramitesAnalizados(tramitesConTareaValida.size())
				.tiempoPromedioTotal(tiempoPromedioTotal)
				.nodoCriticoId(critico.getNodoId())
				.nodoCriticoEtiqueta(critico.getEtiqueta())
				.nodoCriticoPromedio(critico.getTiempoPromedio())
				.detalleNodos(detalle)
				.build();
	}

	private static AnalisisPoliticaMetricasDTO vacio(String politicaId) {
		return AnalisisPoliticaMetricasDTO.builder()
				.politicaId(politicaId)
				.tramitesAnalizados(0)
				.tiempoPromedioTotal(0.0)
				.nodoCriticoId(null)
				.nodoCriticoEtiqueta("—")
				.nodoCriticoPromedio(0.0)
				.detalleNodos(List.of())
				.build();
	}

	private static String etiquetaNodo(NodoPolitica np, String nodoId, List<Tarea> tareas) {
		if (np != null && np.getEtiqueta() != null && !np.getEtiqueta().isBlank()) {
			return np.getEtiqueta().trim();
		}
		return tareas.stream()
				.filter(t -> nodoId.equals(t.getNodoFlujoId()))
				.map(Tarea::getActividadEtiqueta)
				.filter(s -> s != null && !s.isBlank())
				.findFirst()
				.map(String::trim)
				.orElse(nodoId);
	}

	private static String departamentoNodo(NodoPolitica np, String nodoId, List<Tarea> tareas) {
		if (np != null && np.getDepartamentoTexto() != null && !np.getDepartamentoTexto().isBlank()) {
			return np.getDepartamentoTexto().trim();
		}
		return tareas.stream()
				.filter(t -> nodoId.equals(t.getNodoFlujoId()))
				.map(Tarea::getDepartamentoTexto)
				.filter(s -> s != null && !s.isBlank())
				.findFirst()
				.map(String::trim)
				.orElse("—");
	}

	/**
	 * &lt; 1 día RAPIDO; 1–3 MEDIO; 3–5 ALTO; ≥5 CRITICO.
	 */
	static EstadoAnalisisNodo estadoDesdeDiasPromedio(double dias) {
		if (dias < 1.0) {
			return EstadoAnalisisNodo.RAPIDO;
		}
		if (dias < 3.0) {
			return EstadoAnalisisNodo.MEDIO;
		}
		if (dias < 5.0) {
			return EstadoAnalisisNodo.ALTO;
		}
		return EstadoAnalisisNodo.CRITICO;
	}
}
