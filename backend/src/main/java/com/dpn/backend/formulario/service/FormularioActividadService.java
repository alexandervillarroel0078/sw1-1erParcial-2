package com.dpn.backend.formulario.service;

import com.dpn.backend.exception.ApiException;
import com.dpn.backend.formulario.model.FormularioActividad;
import com.dpn.backend.formulario.repository.FormularioActividadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FormularioActividadService {

	private final FormularioActividadRepository formularioActividadRepository;

	public FormularioActividad obtenerPorPoliticaYNodo(String politicaId, String nodoActividadId) {
		return formularioActividadRepository.findByPoliticaIdAndNodoActividadId(politicaId, nodoActividadId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Formulario no encontrado"));
	}

	public Optional<FormularioActividad> obtenerPorPoliticaYNodoOpcional(String politicaId, String nodoActividadId) {
		return formularioActividadRepository.findByPoliticaIdAndNodoActividadId(politicaId, nodoActividadId);
	}

	public FormularioActividad guardar(FormularioActividad form) {
		var existing = formularioActividadRepository.findByPoliticaIdAndNodoActividadId(
				form.getPoliticaId(), form.getNodoActividadId());
		if (existing.isPresent()) {
			FormularioActividad e = existing.get();
			e.setCampos(form.getCampos());
			e.setTituloDocumentoColaborativo(form.getTituloDocumentoColaborativo());
			e.setSeccionesDocumentoColaborativo(form.getSeccionesDocumentoColaborativo() != null
					? form.getSeccionesDocumentoColaborativo()
					: new ArrayList<>());
			e.setHabilitadoDocumentoColaborativo(form.isHabilitadoDocumentoColaborativo());
			return formularioActividadRepository.save(e);
		}
		if (form.getSeccionesDocumentoColaborativo() == null) {
			form.setSeccionesDocumentoColaborativo(new ArrayList<>());
		}
		if (form.getId() == null || form.getId().isBlank()) {
			form.setId(UUID.randomUUID().toString());
		}
		return formularioActividadRepository.save(form);
	}
}
