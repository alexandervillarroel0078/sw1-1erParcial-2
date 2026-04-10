package com.dpn.backend.repository;

import com.dpn.backend.model.FormularioActividad;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface FormularioActividadRepository extends MongoRepository<FormularioActividad, String> {

	Optional<FormularioActividad> findByPoliticaIdAndNodoActividadId(String politicaId, String nodoActividadId);
}
