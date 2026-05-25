package com.dpn.backend.tramite.dto;

import com.dpn.backend.tarea.dto.TareaTramiteDetalleDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TramiteDetalleAdminResponse {

	private TramiteResumenDetalleDTO tramite;
	private List<TareaTramiteDetalleDTO> tareas;
}
