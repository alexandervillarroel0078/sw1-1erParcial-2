package com.dpn.backend.repository;

import com.dpn.backend.model.Departamento;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Nota: {@code existsByDepartamentoId} no aplica a esta entidad (no tiene ese campo).
 * Se expone {@link #existsByNombreIgnoreCase(String)} para validar nombres únicos.
 */
public interface DepartamentoRepository extends MongoRepository<Departamento, String> {

	List<Departamento> findByActivoTrue();

	boolean existsByNombreIgnoreCase(String nombre);
}
