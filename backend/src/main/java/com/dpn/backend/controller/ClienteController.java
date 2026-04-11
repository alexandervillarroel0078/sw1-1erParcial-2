package com.dpn.backend.controller;

import com.dpn.backend.dto.ClientePublicDTO;
import com.dpn.backend.service.ClienteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/clientes")
@RequiredArgsConstructor
public class ClienteController {

	private final ClienteService clienteService;

	@GetMapping
	public List<ClientePublicDTO> listar() {
		return clienteService.listarTodosPublicos();
	}
}
