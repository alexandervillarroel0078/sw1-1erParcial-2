package com.dpn.backend.repository;

import com.dpn.backend.model.Tarea;
import com.dpn.backend.model.enums.EstadoTarea;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TareaRepository extends MongoRepository<Tarea, String> {

	List<Tarea> findByUsuarioAsignadoId(String usuarioAsignadoId);

	List<Tarea> findByTramiteId(String tramiteId);

	List<Tarea> findByUsuarioAsignadoIdAndEstadoNot(String usuarioAsignadoId, EstadoTarea estado);
}
