package com.dpn.backend.formulario.repository;

import com.dpn.backend.formulario.model.FormularioActividad;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface FormularioActividadRepository extends MongoRepository<FormularioActividad, String> {

	Optional<FormularioActividad> findByPoliticaIdAndNodoActividadId(String politicaId, String nodoActividadId);
}
