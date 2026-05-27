package com.dpn.backend.colaborativo.repository;

import com.dpn.backend.colaborativo.model.DocumentoColaborativo;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface DocumentoColaborativoRepository extends MongoRepository<DocumentoColaborativo, String> {

	Optional<DocumentoColaborativo> findByTramiteIdAndNodoId(String tramiteId, String nodoId);
}
