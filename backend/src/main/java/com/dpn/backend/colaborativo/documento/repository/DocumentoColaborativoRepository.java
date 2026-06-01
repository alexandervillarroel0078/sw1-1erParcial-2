package com.dpn.backend.colaborativo.documento.repository;

import com.dpn.backend.colaborativo.documento.model.DocumentoColaborativo;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface DocumentoColaborativoRepository extends MongoRepository<DocumentoColaborativo, String> {

	Optional<DocumentoColaborativo> findByTramiteIdAndNodoId(String tramiteId, String nodoId);
}
