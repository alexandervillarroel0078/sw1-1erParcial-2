package com.dpn.backend.config;

import com.dpn.backend.model.Cliente;
import com.dpn.backend.model.Departamento;
import com.dpn.backend.model.Politica;
import com.dpn.backend.model.Usuario;
import com.dpn.backend.model.embedded.AristaPolitica;
import com.dpn.backend.model.embedded.NodoPolitica;
import com.dpn.backend.model.enums.OrientacionCalles;
import com.dpn.backend.model.enums.RolUsuario;
import com.dpn.backend.model.enums.TipoNodo;
import com.dpn.backend.repository.ClienteRepository;
import com.dpn.backend.repository.DepartamentoRepository;
import com.dpn.backend.repository.PoliticaRepository;
import com.dpn.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

	private final DepartamentoRepository departamentoRepository;
	private final UsuarioRepository usuarioRepository;
	private final ClienteRepository clienteRepository;
	private final PoliticaRepository politicaRepository;
	private final PasswordEncoder passwordEncoder;

	@Override
	public void run(String... args) {
		if (departamentoRepository.count() != 0) {
			return;
		}

		Map<String, String> deptIds = seedDepartamentos();
		seedUsuarios(deptIds);
		seedCliente();
		seedPolitica(deptIds);

		log.info("Base de datos inicializada con datos de prueba");
	}

	private Map<String, String> seedDepartamentos() {
		List<Departamento> deptos = List.of(
				Departamento.builder().id(UUID.randomUUID().toString()).nombre("Atención al Cliente").activo(true).build(),
				Departamento.builder().id(UUID.randomUUID().toString()).nombre("Validación Técnica").activo(true).build(),
				Departamento.builder().id(UUID.randomUUID().toString()).nombre("Jurídico").activo(true).build(),
				Departamento.builder().id(UUID.randomUUID().toString()).nombre("Dirección").activo(true).build(),
				Departamento.builder().id(UUID.randomUUID().toString()).nombre("Soporte Técnico").activo(true).build());
		departamentoRepository.saveAll(deptos);
		Map<String, String> map = new LinkedHashMap<>();
		for (Departamento d : deptos) {
			map.put(d.getNombre(), d.getId());
		}
		return map;
	}

	private void seedUsuarios(Map<String, String> deptIds) {
		Instant now = Instant.now();
		String idAc = deptIds.get("Atención al Cliente");
		String idVt = deptIds.get("Validación Técnica");

		List<Usuario> usuarios = new ArrayList<>();
		usuarios.add(Usuario.builder()
				.id(UUID.randomUUID().toString())
				.nombre("Administrador Demo")
				.correo("admin@demo.com")
				.passwordHash(passwordEncoder.encode("admin123"))
				.rol(RolUsuario.ADMINISTRADOR)
				.departamentoId(null)
				.activo(true)
				.creadoEn(now)
				.build());
		usuarios.add(Usuario.builder()
				.id(UUID.randomUUID().toString())
				.nombre("Ana Martínez")
				.correo("ana@demo.com")
				.passwordHash(passwordEncoder.encode("func123"))
				.rol(RolUsuario.FUNCIONARIO)
				.departamentoId(idAc)
				.activo(true)
				.creadoEn(now)
				.build());
		usuarios.add(Usuario.builder()
				.id(UUID.randomUUID().toString())
				.nombre("Luis Gómez")
				.correo("luis@demo.com")
				.passwordHash(passwordEncoder.encode("func123"))
				.rol(RolUsuario.FUNCIONARIO)
				.departamentoId(idVt)
				.activo(true)
				.creadoEn(now)
				.build());
		usuarioRepository.saveAll(usuarios);
	}

	private void seedCliente() {
		Cliente c = Cliente.builder()
				.id(UUID.randomUUID().toString())
				.nombreCompleto("Juan Flores")
				.email("juan@demo.com")
				.passwordHash(passwordEncoder.encode("cliente123"))
				.telefono("76543210")
				.activo(true)
				.creadoEn(Instant.now())
				.build();
		clienteRepository.save(c);
	}

	private void seedPolitica(Map<String, String> deptIds) {
		String idAc = deptIds.get("Atención al Cliente");
		String idVt = deptIds.get("Validación Técnica");
		String idDir = deptIds.get("Dirección");

		final String nidStart = "seed-n-start";
		final String nidRecep = "seed-n-recepcion";
		final String nidVal = "seed-n-validacion";
		final String nidDec = "seed-n-decision";
		final String nidAprob = "seed-n-aprobacion";
		final String nidRechazo = "seed-n-rechazo";
		final String nidEndOk = "seed-n-end-ok";
		final String nidEndNo = "seed-n-end-rechazo";

		double yMain = 120;
		List<NodoPolitica> nodos = List.of(
				NodoPolitica.builder()
						.id(nidStart)
						.tipo(TipoNodo.START)
						.etiqueta("Inicio")
						.posicionX(40)
						.posicionY(yMain)
						.build(),
				NodoPolitica.builder()
						.id(nidRecep)
						.tipo(TipoNodo.ACTIVIDAD)
						.etiqueta("Recepción")
						.posicionX(200)
						.posicionY(yMain)
						.departamentoId(idAc)
						.build(),
				NodoPolitica.builder()
						.id(nidVal)
						.tipo(TipoNodo.ACTIVIDAD)
						.etiqueta("Validación")
						.posicionX(360)
						.posicionY(yMain)
						.departamentoId(idVt)
						.build(),
				NodoPolitica.builder()
						.id(nidDec)
						.tipo(TipoNodo.DECISION)
						.etiqueta("¿OK?")
						.posicionX(520)
						.posicionY(yMain)
						.build(),
				NodoPolitica.builder()
						.id(nidAprob)
						.tipo(TipoNodo.ACTIVIDAD)
						.etiqueta("Aprobación")
						.posicionX(720)
						.posicionY(yMain)
						.departamentoId(idDir)
						.build(),
				NodoPolitica.builder()
						.id(nidRechazo)
						.tipo(TipoNodo.ACTIVIDAD)
						.etiqueta("Rechazo")
						.posicionX(520)
						.posicionY(260)
						.departamentoId(idAc)
						.build(),
				NodoPolitica.builder()
						.id(nidEndOk)
						.tipo(TipoNodo.END)
						.etiqueta("Fin — Instalación completada")
						.posicionX(920)
						.posicionY(yMain)
						.build(),
				NodoPolitica.builder()
						.id(nidEndNo)
						.tipo(TipoNodo.END)
						.etiqueta("Fin — Solicitud rechazada")
						.posicionX(720)
						.posicionY(320)
						.build());

		List<AristaPolitica> aristas = List.of(
				arista("seed-a-1", nidStart, nidRecep, null),
				arista("seed-a-2", nidRecep, nidVal, null),
				arista("seed-a-3", nidVal, nidDec, null),
				arista("seed-a-4", nidDec, nidAprob, "Sí"),
				arista("seed-a-5", nidDec, nidRechazo, "No"),
				arista("seed-a-6", nidAprob, nidEndOk, null),
				arista("seed-a-7", nidRechazo, nidEndNo, null));

		Politica p = Politica.builder()
				.id(UUID.randomUUID().toString())
				.nombre("Instalación de medidor CRE")
				.subtitulo("Flujo de prueba — instalación y validación")
				.colorTema("#0C447C")
				.activa(true)
				.fechaCreacion(Instant.now())
				.orientacionCalles(OrientacionCalles.HORIZONTAL)
				.nodos(new ArrayList<>(nodos))
				.aristas(new ArrayList<>(aristas))
				.callesDiseno(new ArrayList<>())
				.build();
		politicaRepository.save(p);
	}

	private static AristaPolitica arista(String id, String desde, String hacia, String etiqueta) {
		return AristaPolitica.builder()
				.id(id)
				.desdeNodoId(desde)
				.haciaNodoId(hacia)
				.etiqueta(etiqueta)
				.build();
	}
}
