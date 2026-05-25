package com.dpn.backend.usuario.repository;

import com.dpn.backend.usuario.model.Usuario;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {

	Optional<Usuario> findByCorreoIgnoreCase(String correo);

	List<Usuario> findByDepartamentoIdAndActivoTrue(String departamentoId);

	boolean existsByDepartamentoId(String departamentoId);
}
