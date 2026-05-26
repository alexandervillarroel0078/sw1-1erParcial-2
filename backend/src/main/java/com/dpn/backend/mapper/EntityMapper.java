package com.dpn.backend.mapper;

import com.dpn.backend.cliente.dto.ClientePublicDTO;
import com.dpn.backend.tarea.dto.TareaDTO;
import com.dpn.backend.usuario.dto.UsuarioDTO;
import com.dpn.backend.cliente.model.Cliente;
import com.dpn.backend.tarea.model.Tarea;
import com.dpn.backend.usuario.model.Usuario;
import lombok.experimental.UtilityClass;

@UtilityClass
public class EntityMapper {

	public UsuarioDTO toUsuarioDTO(Usuario u) {
		if (u == null) {
			return null;
		}
		return UsuarioDTO.builder()
				.id(u.getId())
				.nombre(u.getNombre())
				.correo(u.getCorreo())
				.rol(u.getRol())
				.departamentoId(u.getDepartamentoId())
				.activo(u.isActivo())
				.creadoEn(u.getCreadoEn())
				.build();
	}

	public ClientePublicDTO toClientePublicDTO(Cliente c) {
		if (c == null) {
			return null;
		}
		return ClientePublicDTO.builder()
				.id(c.getId())
				.nombreCompleto(c.getNombreCompleto())
				.telefono(c.getTelefono())
				.email(c.getEmail())
				.tokenFcm(c.getTokenFcm())
				.activo(c.isActivo())
				.creadoEn(c.getCreadoEn())
				.build();
	}

	public TareaDTO toTareaDTO(Tarea t) {
		if (t == null) {
			return null;
		}
		return TareaDTO.builder()
				.id(t.getId())
				.tramiteId(t.getTramiteId())
				.nodoFlujoId(t.getNodoFlujoId())
				.actividadEtiqueta(t.getActividadEtiqueta())
				.departamentoTexto(t.getDepartamentoTexto())
				.politicaId(t.getPoliticaId())
				.politicaNombre(t.getPoliticaNombre())
				.pasoActual(t.getPasoActual())
				.totalPasos(t.getTotalPasos())
				.clienteNombre(t.getClienteNombre())
				.tramiteClienteId(t.getTramiteClienteId())
				.diasAbierto(t.getDiasAbierto())
				.usuarioAsignadoId(t.getUsuarioAsignadoId())
				.estado(t.getEstado())
				.creadoEn(t.getCreadoEn())
				.completadoEn(t.getCompletadoEn())
				.permisoDocumentos(t.getPermisoDocumentos())
				.build();
	}
}
