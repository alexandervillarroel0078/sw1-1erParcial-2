package com.dpn.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		String allowedOrigins = System.getenv("ALLOWED_ORIGINS");
		if (allowedOrigins == null || allowedOrigins.isBlank()) {
			allowedOrigins = "http://localhost:4200,http://192.168.0.11:4200,https://frontend-734852757342.us-central1.run.app";
		}
		String[] origins = allowedOrigins.split(",");

		List<String> originsList = new ArrayList<>(Arrays.asList(origins));
		if (!originsList.contains("http://host.docker.internal")) {
			originsList.add("http://host.docker.internal");
		}
		if (!originsList.contains("http://host.docker.internal:80")) {
			originsList.add("http://host.docker.internal:80");
		}

		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(originsList);
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("*"));
		config.setAllowCredentials(true);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
