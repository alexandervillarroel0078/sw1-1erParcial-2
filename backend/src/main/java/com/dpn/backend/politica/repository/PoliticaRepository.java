package com.dpn.backend.politica.repository;

import com.dpn.backend.politica.model.Politica;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PoliticaRepository extends MongoRepository<Politica, String> {

	List<Politica> findByActivaTrue();

	List<Politica> findAllByOrderByFechaCreacionDesc();
}
