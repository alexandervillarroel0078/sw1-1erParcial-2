package com.dpn.backend.repository;

import com.dpn.backend.model.Informe;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface InformeRepository extends MongoRepository<Informe, String> {

	List<Informe> findByTramiteIdOrderByCreadoEnDesc(String tramiteId);

	List<Informe> findByFuncionarioId(String funcionarioId);

	Optional<Informe> findByTareaId(String tareaId);
}
