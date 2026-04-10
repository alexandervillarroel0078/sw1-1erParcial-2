package com.dpn.backend.repository;

import com.dpn.backend.model.Notificacion;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificacionRepository extends MongoRepository<Notificacion, String> {

	List<Notificacion> findByClienteIdOrderByEnviadoEnDesc(String clienteId);

	List<Notificacion> findByClienteIdAndLeidaFalse(String clienteId);
}
