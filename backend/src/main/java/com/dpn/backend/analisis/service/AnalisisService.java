package com.dpn.backend.analisis.service;

import com.dpn.backend.analisis.dto.AnalisisNodoDetalleDTO;
import com.dpn.backend.analisis.dto.AnalisisPoliticaMetricasDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.politica.model.Politica;
import com.dpn.backend.tarea.model.Tarea;
import com.dpn.backend.tramite.model.Tramite;
import com.dpn.backend.politica.model.embedded.NodoPolitica;
import com.dpn.backend.analisis.model.enums.EstadoAnalisisNodo;
import com.dpn.backend.tarea.model.enums.EstadoTarea;
import com.dpn.backend.politica.repository.PoliticaRepository;
import com.dpn.backend.tarea.repository.TareaRepository;
import com.dpn.backend.tramite.repository.TramiteRepository;
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

	private static final double MS_POR_MINUTO = 60_000.0;

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
		int totalDemorados = (int) tareaRepository.findByTramiteIdInAndEstado(tramiteIds, EstadoTarea.DEMORADO).size();
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
			double minutos = Duration.between(t.getCreadoEn(), t.getCompletadoEn()).toMillis() / MS_POR_MINUTO;
			duracionesPorNodo.computeIfAbsent(t.getNodoFlujoId(), k -> new ArrayList<>()).add(minutos);
			if (t.getTramiteId() != null) {
				tramitesConTareaValida.add(t.getTramiteId());
			}
			todasLasDuraciones.add(minutos);
		}

		if (duracionesPorNodo.isEmpty()) {
			return AnalisisPoliticaMetricasDTO.builder()
					.politicaId(politicaId)
					.tramitesAnalizados(0)
					.totalDemorados(totalDemorados)
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
			int cantidadDemorados = contarDemoradosEnNodo(nodoId, tramiteIds);
			detalle.add(AnalisisNodoDetalleDTO.builder()
					.nodoId(nodoId)
					.etiqueta(etiqueta)
					.departamento(departamento)
					.tiempoPromedio(promedio)
					.cantidadTareas(vals.size())
					.cantidadDemorados(cantidadDemorados)
					.estado(estadoDesdeMinutosPromedio(promedio))
					.build());
		}

		detalle.sort(Comparator.comparingDouble(AnalisisNodoDetalleDTO::getTiempoPromedio).reversed());

		AnalisisNodoDetalleDTO critico = detalle.get(0);
		double tiempoPromedioTotal = todasLasDuraciones.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

		return AnalisisPoliticaMetricasDTO.builder()
				.politicaId(politicaId)
				.tramitesAnalizados(tramitesConTareaValida.size())
				.totalDemorados(totalDemorados)
				.tiempoPromedioTotal(tiempoPromedioTotal)
				.nodoCriticoId(critico.getNodoId())
				.nodoCriticoEtiqueta(critico.getEtiqueta())
				.nodoCriticoPromedio(critico.getTiempoPromedio())
				.detalleNodos(detalle)
				.build();
	}

	private int contarDemoradosEnNodo(String nodoFlujoId, Set<String> tramiteIdsPolitica) {
		return (int) tareaRepository.findByNodoFlujoIdAndEstado(nodoFlujoId, EstadoTarea.DEMORADO).stream()
				.filter(t -> t.getTramiteId() != null && tramiteIdsPolitica.contains(t.getTramiteId()))
				.count();
	}

	private static AnalisisPoliticaMetricasDTO vacio(String politicaId) {
		return AnalisisPoliticaMetricasDTO.builder()
				.politicaId(politicaId)
				.tramitesAnalizados(0)
				.totalDemorados(0)
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

	static EstadoAnalisisNodo estadoDesdeMinutosPromedio(double minutos) {
		if (minutos < 5.0) {
			return EstadoAnalisisNodo.RAPIDO;
		}
		if (minutos < 15.0) {
			return EstadoAnalisisNodo.MEDIO;
		}
		if (minutos < 30.0) {
			return EstadoAnalisisNodo.ALTO;
		}
		return EstadoAnalisisNodo.CRITICO;
	}
}
