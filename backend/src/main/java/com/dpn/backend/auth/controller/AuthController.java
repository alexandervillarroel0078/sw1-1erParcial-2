package com.dpn.backend.auth.controller;

import com.dpn.backend.auth.dto.LoginRequest;
import com.dpn.backend.auth.dto.LoginResponse;
import com.dpn.backend.auth.dto.RegistroClienteRequest;
import com.dpn.backend.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest request) {
		return authService.login(request);
	}

	@PostMapping("/registro-cliente")
	@ResponseStatus(HttpStatus.CREATED)
	public LoginResponse registroCliente(@Valid @RequestBody RegistroClienteRequest request) {
		return authService.registroCliente(request);
	}
}
