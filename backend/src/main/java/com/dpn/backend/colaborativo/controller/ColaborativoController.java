package com.dpn.backend.colaborativo.controller;

import com.dpn.backend.colaborativo.dto.CambioCanvasDTO;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class ColaborativoController {

	@MessageMapping("/politica/{id}/cambio")
	@SendTo("/topic/politica/{id}")
	public CambioCanvasDTO reenviarCambio(
			@DestinationVariable String id,
			CambioCanvasDTO cambio) {
		return cambio;
	}
}
