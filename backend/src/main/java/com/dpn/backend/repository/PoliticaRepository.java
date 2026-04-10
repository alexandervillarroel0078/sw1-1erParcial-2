package com.dpn.backend.repository;

import com.dpn.backend.model.Politica;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PoliticaRepository extends MongoRepository<Politica, String> {

	List<Politica> findByActivaTrue();

	List<Politica> findAllByOrderByFechaCreacionDesc();
}
