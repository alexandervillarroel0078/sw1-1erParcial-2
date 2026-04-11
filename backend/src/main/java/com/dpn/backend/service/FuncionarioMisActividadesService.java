package com.dpn.backend.service;

import com.dpn.backend.dto.ActividadCatalogoDTO;
import com.dpn.backend.dto.MisActividadesFuncionarioResponseDTO;
import com.dpn.backend.dto.PoliticaActividadesFuncionarioDTO;
import com.dpn.backend.model.Departamento;
import com.dpn.backend.model.Politica;
import com.dpn.backend.model.Usuario;
import com.dpn.backend.model.embedded.NodoPolitica;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.model.enums.TipoNodo;
import com.dpn.backend.repository.DepartamentoRepository;
import com.dpn.backend.repository.PoliticaRepository;
import com.dpn.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FuncionarioMisActividadesService {

	private final UsuarioRepository usuarioRepository;
	private final DepartamentoRepository departamentoRepository;
	private final PoliticaRepository politicaRepository;

	public MisActividadesFuncionarioResponseDTO listarPorUsuarioAutenticado(String usuarioId) {
		Usuario u = usuarioRepository.findById(usuarioId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
		String deptId = u.getDepartamentoId();
		if (deptId == null || deptId.isBlank()) {
			return MisActividadesFuncionarioResponseDTO.builder()
					.departamentoNombre(null)
					.politicas(List.of())
					.build();
		}
		String departamentoNombre = departamentoRepository.findById(deptId)
				.map(Departamento::getNombre)
				.orElse("—");

		List<PoliticaActividadesFuncionarioDTO> bloques = new ArrayList<>();
		for (Politica p : politicaRepository.findByActivaTrue()) {
			List<ActividadCatalogoDTO> actividades = extraerActividadesDeDepartamento(p, deptId);
			if (!actividades.isEmpty()) {
				bloques.add(PoliticaActividadesFuncionarioDTO.builder()
						.politicaNombre(p.getNombre() != null ? p.getNombre() : "Política")
						.actividades(actividades)
						.build());
			}
		}
		bloques.sort(Comparator.comparing(PoliticaActividadesFuncionarioDTO::getPoliticaNombre,
				Comparator.nullsLast(String::compareToIgnoreCase)));

		return MisActividadesFuncionarioResponseDTO.builder()
				.departamentoNombre(departamentoNombre)
				.politicas(bloques)
				.build();
	}

	private static List<ActividadCatalogoDTO> extraerActividadesDeDepartamento(Politica politica, String departamentoId) {
		List<ActividadCatalogoDTO> out = new ArrayList<>();
		if (politica.getNodos() == null) {
			return out;
		}
		int paso = 0;
		for (NodoPolitica n : politica.getNodos()) {
			if (n.getTipo() != TipoNodo.ACTIVIDAD) {
				continue;
			}
			paso++;
			if (departamentoId.equals(n.getDepartamentoId())) {
				String etiqueta = n.getEtiqueta() != null && !n.getEtiqueta().isBlank()
						? n.getEtiqueta()
						: "Actividad";
				out.add(ActividadCatalogoDTO.builder()
						.etiqueta(etiqueta)
						.paso(paso)
						.build());
			}
		}
		return out;
	}
}
