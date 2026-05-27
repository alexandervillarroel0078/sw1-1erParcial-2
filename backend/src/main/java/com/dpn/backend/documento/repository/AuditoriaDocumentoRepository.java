package com.dpn.backend.documento.repository;

import com.dpn.backend.documento.model.AuditoriaDocumento;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AuditoriaDocumentoRepository extends MongoRepository<AuditoriaDocumento, String> {
    List<AuditoriaDocumento> findByDocumentoId(String documentoId);
    List<AuditoriaDocumento> findByDocumentoIdOrderByTimestampDesc(String documentoId);
    List<AuditoriaDocumento> findByTramiteIdOrderByTimestampDesc(String tramiteId);
}
