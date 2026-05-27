package com.dpn.backend.colaborativo.controller;

import com.dpn.backend.colaborativo.dto.DocumentoColaborativoDTO;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class DocumentoColaborativoWsController {

	@MessageMapping("/doc-colaborativo/{tramiteId}/{nodoId}/cambio")
	@SendTo("/topic/doc-colaborativo/{tramiteId}/{nodoId}")
	public DocumentoColaborativoDTO reenviarCambio(
			@DestinationVariable String tramiteId,
			@DestinationVariable String nodoId,
			DocumentoColaborativoDTO cambio) {
		return cambio;
	}
}
