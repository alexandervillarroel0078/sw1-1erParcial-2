package com.dpn.backend.controller;

import com.dpn.backend.dto.AnalisisPoliticaMetricasDTO;
import com.dpn.backend.service.AnalisisService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analisis")
@RequiredArgsConstructor
public class AnalisisController {

	private final AnalisisService analisisService;

	@GetMapping("/politicas/{politicaId}")
	public AnalisisPoliticaMetricasDTO metricasPorPolitica(@PathVariable String politicaId) {
		return analisisService.calcularMetricas(politicaId);
	}
}
