package com.dpn.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class JwtUtil {

	public static final String CLAIM_ROLES = "roles";

	@Value("${jwt.secret}")
	private String secret;

	@Value("${jwt.expiration}")
	private long expirationMs;

	public String generateToken(String subject, Collection<String> roles) {
		return generateToken(subject, Map.of(CLAIM_ROLES, roles));
	}

	public String generateToken(String subject, Map<String, Object> extraClaims) {
		Date now = new Date();
		Date exp = new Date(now.getTime() + expirationMs);
		var builder = Jwts.builder()
				.subject(subject)
				.issuedAt(now)
				.expiration(exp)
				.signWith(signingKey());
		extraClaims.forEach(builder::claim);
		return builder.compact();
	}

	public boolean validateToken(String token) {
		try {
			Jwts.parser().verifyWith(signingKey()).build().parseSignedClaims(token);
			return true;
		} catch (Exception e) {
			return false;
		}
	}

	public Claims extractClaims(String token) {
		return Jwts.parser().verifyWith(signingKey()).build()
				.parseSignedClaims(token)
				.getPayload();
	}

	@SuppressWarnings("unchecked")
	public List<String> extractRoles(Claims claims) {
		Object raw = claims.get(CLAIM_ROLES);
		if (raw instanceof List<?>) {
			return ((List<?>) raw).stream().map(Object::toString).collect(Collectors.toList());
		}
		if (raw instanceof String s) {
			return List.of(s);
		}
		return List.of();
	}

	private SecretKey signingKey() {
		byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
		if (keyBytes.length < 32) {
			try {
				keyBytes = MessageDigest.getInstance("SHA-256").digest(keyBytes);
			} catch (NoSuchAlgorithmException e) {
				throw new IllegalStateException("SHA-256 no disponible", e);
			}
		}
		return Keys.hmacShaKeyFor(keyBytes);
	}
}
