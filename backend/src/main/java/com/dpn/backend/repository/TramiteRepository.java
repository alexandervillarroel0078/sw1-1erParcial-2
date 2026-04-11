package com.dpn.backend.repository;

import com.dpn.backend.model.Tramite;
import com.dpn.backend.model.enums.EstadoTramite;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface TramiteRepository extends MongoRepository<Tramite, String> {

	List<Tramite> findByEstado(EstadoTramite estado);

	List<Tramite> findByEstadoIn(Collection<EstadoTramite> estados);

	List<Tramite> findByPoliticaId(String politicaId);

	List<Tramite> findByClienteId(String clienteId);
}
