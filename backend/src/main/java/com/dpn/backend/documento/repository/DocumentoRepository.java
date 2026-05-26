package com.dpn.backend.documento.repository;

import com.dpn.backend.documento.model.Documento;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DocumentoRepository extends MongoRepository<Documento, String> {
    List<Documento> findByTramiteId(String tramiteId);
    List<Documento> findByTramiteIdAndNodoId(String tramiteId, String nodoId);
}
