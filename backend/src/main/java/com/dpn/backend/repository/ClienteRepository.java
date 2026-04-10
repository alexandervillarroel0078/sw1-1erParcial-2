package com.dpn.backend.repository;

import com.dpn.backend.model.Cliente;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ClienteRepository extends MongoRepository<Cliente, String> {

	Optional<Cliente> findByEmailIgnoreCase(String email);
}
