package com.dpn.backend.config;

import com.dpn.backend.cliente.model.Cliente;
import com.dpn.backend.departamento.model.Departamento;
import com.dpn.backend.politica.model.Politica;
import com.dpn.backend.usuario.model.Usuario;
import com.dpn.backend.politica.model.embedded.AristaPolitica;
import com.dpn.backend.politica.model.embedded.NodoPolitica;
import com.dpn.backend.politica.model.enums.OrientacionCalles;
import com.dpn.backend.auth.model.enums.RolUsuario;
import com.dpn.backend.politica.model.enums.TipoNodo;
import com.dpn.backend.cliente.repository.ClienteRepository;
import com.dpn.backend.departamento.repository.DepartamentoRepository;
import com.dpn.backend.politica.repository.PoliticaRepository;
import com.dpn.backend.usuario.repository.UsuarioRepository;
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
import java.util.stream.Collectors;

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
		Map<String, String> deptIds = ensureDepartamentos();
		boolean changed = false;
		changed |= ensureUsuarios(deptIds);
		changed |= ensureClientes();
		changed |= ensurePoliticas(deptIds);
		if (changed) {
			log.info("Datos demo inicializados/completados correctamente");
		} else {
			log.info("Datos demo ya estaban completos");
		}
	}

	private Map<String, String> ensureDepartamentos() {
		List<String> expected = List.of(
				"Atención al Cliente",
				"Validación Técnica",
				"Jurídico",
				"Dirección",
				"Soporte Técnico",
				"RRHH",
				"Redacción",
				"Revisión",
				"Legal",
				"Finanzas",
				"Comercial",
				"Riesgos");

		Map<String, Departamento> existentesPorNombre = departamentoRepository.findAll()
				.stream()
				.collect(Collectors.toMap(Departamento::getNombre, d -> d, (a, b) -> a, LinkedHashMap::new));

		List<Departamento> nuevos = new ArrayList<>();
		for (String nombre : expected) {
			if (!containsDepartamento(existentesPorNombre, nombre)) {
				nuevos.add(Departamento.builder()
						.id(UUID.randomUUID().toString())
						.nombre(nombre)
						.activo(true)
						.build());
			}
		}

		if (!nuevos.isEmpty()) {
			departamentoRepository.saveAll(nuevos);
		}

		Map<String, String> map = new LinkedHashMap<>();
		for (Departamento d : departamentoRepository.findAll()) {
			map.put(d.getNombre(), d.getId());
		}
		return map;
	}

	private boolean ensureUsuarios(Map<String, String> deptIds) {
		Instant now = Instant.now();

		List<UsuarioSeed> seeds = List.of(
				new UsuarioSeed("admin@demo.com", "Admin Demo", "admin123", RolUsuario.ADMINISTRADOR, null),
				new UsuarioSeed("admin2@demo.com", "Admin Demo2", "admin123", RolUsuario.ADMINISTRADOR, null),

				new UsuarioSeed("ana@demo.com", "Ana Martinez", "func123", RolUsuario.FUNCIONARIO, "Atención al Cliente"),
				new UsuarioSeed("luis@demo.com", "Luis Gomez", "func123", RolUsuario.FUNCIONARIO, "Validación Técnica"),
				new UsuarioSeed("carlos@demo.com", "Carlos Ruiz", "func123", RolUsuario.FUNCIONARIO, "Jurídico"),
				new UsuarioSeed("maria@demo.com", "Maria Lopez", "func123", RolUsuario.FUNCIONARIO, "Dirección"),
				new UsuarioSeed("pedro@demo.com", "Pedro Soria", "func123", RolUsuario.FUNCIONARIO, "Soporte Técnico"),
				new UsuarioSeed("rrhh@demo.com", "Rosa Herrera", "func123", RolUsuario.FUNCIONARIO, "RRHH"),
				new UsuarioSeed("redaccion@demo.com", "Red Informe", "func123", RolUsuario.FUNCIONARIO, "Redacción"),
				new UsuarioSeed("revision@demo.com", "Rev Informe", "func123", RolUsuario.FUNCIONARIO, "Revisión"),
				new UsuarioSeed("legal@demo.com", "Leo Abogado", "func123", RolUsuario.FUNCIONARIO, "Legal"),
				new UsuarioSeed("finanzas@demo.com", "Fin Ancerio", "func123", RolUsuario.FUNCIONARIO, "Finanzas"),
				new UsuarioSeed("comercial@demo.com", "Com Ercial", "func123", RolUsuario.FUNCIONARIO, "Comercial"),
				new UsuarioSeed("riesgos@demo.com", "Rie Sgoso", "func123", RolUsuario.FUNCIONARIO, "Riesgos"));

		boolean createdAny = false;
		for (UsuarioSeed s : seeds) {
			if (usuarioRepository.findByCorreoIgnoreCase(s.correo()).isPresent()) {
				continue;
			}
			String departamentoId = s.departamentoNombre() == null ? null : requireDepartamentoId(deptIds, s.departamentoNombre());
			usuarioRepository.save(Usuario.builder()
					.id(UUID.randomUUID().toString())
					.nombre(s.nombre())
					.correo(s.correo())
					.passwordHash(passwordEncoder.encode(s.password()))
					.rol(s.rol())
					.departamentoId(departamentoId)
					.activo(true)
					.creadoEn(now)
					.build());
			createdAny = true;
		}
		return createdAny;
	}

	private boolean ensureClientes() {
		List<ClienteSeed> seeds = List.of(
				new ClienteSeed("juan@demo.com", "Juan Perez", "cliente123", "70000001"),
				new ClienteSeed("cliente2@demo.com", "Maria Garcia", "cliente123", "70000002"),
				new ClienteSeed("cliente3@demo.com", "Carlos Mendez", "cliente123", "70000003"));

		boolean createdAny = false;
		for (ClienteSeed s : seeds) {
			if (clienteRepository.findByEmailIgnoreCase(s.email()).isPresent()) {
				continue;
			}
			clienteRepository.save(Cliente.builder()
					.id(UUID.randomUUID().toString())
					.nombreCompleto(s.nombreCompleto())
					.email(s.email())
					.passwordHash(passwordEncoder.encode(s.password()))
					.telefono(s.telefono())
					.activo(true)
					.creadoEn(Instant.now())
					.build());
			createdAny = true;
		}
		return createdAny;
	}

	private boolean ensurePoliticas(Map<String, String> deptIds) {
		boolean createdAny = false;
		createdAny |= createPoliticaIfMissing("Alta de empleado", deptIds, "#0C447C", this::buildPoliticaAltaEmpleado);
		createdAny |= createPoliticaIfMissing("Aprobación de vacaciones", deptIds, "#1F6FEB", this::buildPoliticaVacaciones);
		createdAny |= createPoliticaIfMissing("Corrección de informe", deptIds, "#3A7D44", this::buildPoliticaCorreccionInforme);
		createdAny |= createPoliticaIfMissing("Onboarding de proveedor", deptIds, "#8C4A1F", this::buildPoliticaOnboardingProveedor);
		createdAny |= createPoliticaIfMissing("Solicitud de crédito", deptIds, "#5D2E8C", this::buildPoliticaSolicitudCredito);
		return createdAny;
	}

	private boolean createPoliticaIfMissing(String nombre, Map<String, String> deptIds, String colorTema, PoliticaFactory factory) {
		boolean exists = politicaRepository.findAll()
				.stream()
				.anyMatch(p -> p.getNombre() != null && p.getNombre().equalsIgnoreCase(nombre));
		if (exists) {
			return false;
		}
		Politica politica = factory.build(deptIds);
		politica.setId(UUID.randomUUID().toString());
		politica.setNombre(nombre);
		politica.setActiva(true);
		politica.setColorTema(colorTema);
		politica.setFechaCreacion(Instant.now());
		politica.setOrientacionCalles(OrientacionCalles.HORIZONTAL);
		if (politica.getCallesDiseno() == null) {
			politica.setCallesDiseno(new ArrayList<>());
		}
		politicaRepository.save(politica);
		return true;
	}

	private Politica buildPoliticaAltaEmpleado(Map<String, String> deptIds) {
		String rrhh = requireDepartamentoId(deptIds, "RRHH");
		String start = nodeId("alta", "start");
		String r1 = nodeId("alta", "recibir");
		String r2 = nodeId("alta", "verificar");
		String r3 = nodeId("alta", "crear-usuario");
		String r4 = nodeId("alta", "asignar-equipo");
		String end = nodeId("alta", "end");

		List<NodoPolitica> nodos = List.of(
				nodo(start, TipoNodo.START, "Inicio", 40, 140, null, null),
				nodo(r1, TipoNodo.ACTIVIDAD, "Recibir documentos", 220, 140, rrhh, 60),
				nodo(r2, TipoNodo.ACTIVIDAD, "Verificar identidad", 420, 140, rrhh, 60),
				nodo(r3, TipoNodo.ACTIVIDAD, "Crear usuario en sistema", 640, 140, rrhh, 60),
				nodo(r4, TipoNodo.ACTIVIDAD, "Asignar equipo", 860, 140, rrhh, 60),
				nodo(end, TipoNodo.END, "Fin", 1060, 140, null, null));

		List<AristaPolitica> aristas = List.of(
				arista(start, r1, null),
				arista(r1, r2, null),
				arista(r2, r3, null),
				arista(r3, r4, null),
				arista(r4, end, null));

		return politica("Proceso para registrar a un nuevo empleado en la empresa, incluyendo verificación de identidad, creación de usuario en el sistema y asignación de equipo de trabajo.", nodos, aristas);
	}

	private Politica buildPoliticaVacaciones(Map<String, String> deptIds) {
		String ac = requireDepartamentoId(deptIds, "Atención al Cliente");
		String rrhh = requireDepartamentoId(deptIds, "RRHH");

		String start = nodeId("vacaciones", "start");
		String n1 = nodeId("vacaciones", "solicitar");
		String dec = nodeId("vacaciones", "jefe-aprueba");
		String yes = nodeId("vacaciones", "registrar");
		String no = nodeId("vacaciones", "notificar");
		String endYes = nodeId("vacaciones", "end-si");
		String endNo = nodeId("vacaciones", "end-no");

		List<NodoPolitica> nodos = List.of(
				nodo(start, TipoNodo.START, "Inicio", 40, 180, null, null),
				nodo(n1, TipoNodo.ACTIVIDAD, "Solicitar vacaciones", 230, 180, ac, 30),
				nodo(dec, TipoNodo.DECISION, "¿Jefe aprueba?", 430, 180, null, null),
				nodo(yes, TipoNodo.ACTIVIDAD, "Registrar en sistema", 650, 120, rrhh, 30),
				nodo(no, TipoNodo.ACTIVIDAD, "Notificar rechazo", 650, 260, ac, 30),
				nodo(endYes, TipoNodo.END, "Fin", 870, 120, null, null),
				nodo(endNo, TipoNodo.END, "Fin", 870, 260, null, null));

		List<AristaPolitica> aristas = List.of(
				arista(start, n1, null),
				arista(n1, dec, null),
				arista(dec, yes, "Sí"),
				arista(dec, no, "No"),
				arista(yes, endYes, null),
				arista(no, endNo, null));

		return politica("Proceso para que un empleado solicite días de vacaciones, con aprobación del jefe y registro en el sistema de RRHH.", nodos, aristas);
	}

	private Politica buildPoliticaCorreccionInforme(Map<String, String> deptIds) {
		String redaccion = requireDepartamentoId(deptIds, "Redacción");
		String revision = requireDepartamentoId(deptIds, "Revisión");

		String start = nodeId("informe", "start");
		String redactar = nodeId("informe", "redactar");
		String revisar = nodeId("informe", "revisar");
		String aprobado = nodeId("informe", "aprobado");
		String publicar = nodeId("informe", "publicar");
		String corregir = nodeId("informe", "corregir");
		String end = nodeId("informe", "end");

		List<NodoPolitica> nodos = List.of(
				nodo(start, TipoNodo.START, "Inicio", 40, 170, null, null),
				nodo(redactar, TipoNodo.ACTIVIDAD, "Redactar informe", 230, 170, redaccion, 45),
				nodo(revisar, TipoNodo.ACTIVIDAD, "Revisar informe", 430, 170, revision, 45),
				nodo(aprobado, TipoNodo.DECISION, "¿Aprobado?", 620, 170, null, null),
				nodo(publicar, TipoNodo.ACTIVIDAD, "Publicar informe", 840, 110, redaccion, 45),
				nodo(corregir, TipoNodo.ACTIVIDAD, "Corregir informe", 840, 270, redaccion, 45),
				nodo(end, TipoNodo.END, "Fin", 1040, 110, null, null));

		List<AristaPolitica> aristas = List.of(
				arista(start, redactar, null),
				arista(redactar, revisar, null),
				arista(revisar, aprobado, null),
				arista(aprobado, publicar, "Sí"),
				arista(aprobado, corregir, "No"),
				arista(publicar, end, null),
				arista(corregir, revisar, null));

		return politica("Proceso para redactar, revisar y corregir un informe oficial hasta obtener la aprobación y publicación final.", nodos, aristas);
	}

	private Politica buildPoliticaOnboardingProveedor(Map<String, String> deptIds) {
		String ac = requireDepartamentoId(deptIds, "Atención al Cliente");
		String legal = requireDepartamentoId(deptIds, "Legal");
		String finanzas = requireDepartamentoId(deptIds, "Finanzas");
		String comercial = requireDepartamentoId(deptIds, "Comercial");

		String start = nodeId("proveedor", "start");
		String registrar = nodeId("proveedor", "registrar");
		String fork = nodeId("proveedor", "fork");
		String docs = nodeId("proveedor", "verificar-docs");
		String evalFin = nodeId("proveedor", "evaluar-finanzas");
		String refs = nodeId("proveedor", "revisar-referencias");
		String join = nodeId("proveedor", "join");
		String aprobar = nodeId("proveedor", "aprobar");
		String end = nodeId("proveedor", "end");

		List<NodoPolitica> nodos = List.of(
				nodo(start, TipoNodo.START, "Inicio", 40, 180, null, null),
				nodo(registrar, TipoNodo.ACTIVIDAD, "Registrar proveedor", 220, 180, ac, 60),
				nodo(fork, TipoNodo.FORK_BAR, "Paralelo", 420, 180, null, null),
				nodo(docs, TipoNodo.ACTIVIDAD, "Verificar documentos", 620, 90, legal, 60),
				nodo(evalFin, TipoNodo.ACTIVIDAD, "Evaluar finanzas", 620, 180, finanzas, 60),
				nodo(refs, TipoNodo.ACTIVIDAD, "Revisar referencias", 620, 270, comercial, 60),
				nodo(join, TipoNodo.JOIN_BAR, "Unir", 840, 180, null, null),
				nodo(aprobar, TipoNodo.ACTIVIDAD, "Aprobar proveedor", 1040, 180, ac, 60),
				nodo(end, TipoNodo.END, "Fin", 1240, 180, null, null));

		List<AristaPolitica> aristas = List.of(
				arista(start, registrar, null),
				arista(registrar, fork, null),
				arista(fork, docs, null),
				arista(fork, evalFin, null),
				arista(fork, refs, null),
				arista(docs, join, null),
				arista(evalFin, join, null),
				arista(refs, join, null),
				arista(join, aprobar, null),
				arista(aprobar, end, null));

		return politica("Proceso para registrar y validar un nuevo proveedor, con verificación legal, financiera y de referencias comerciales en paralelo.", nodos, aristas);
	}

	private Politica buildPoliticaSolicitudCredito(Map<String, String> deptIds) {
		String ac = requireDepartamentoId(deptIds, "Atención al Cliente");
		String vt = requireDepartamentoId(deptIds, "Validación Técnica");
		String legal = requireDepartamentoId(deptIds, "Legal");
		String riesgos = requireDepartamentoId(deptIds, "Riesgos");
		String direccion = requireDepartamentoId(deptIds, "Dirección");

		String start = nodeId("credito", "start");
		String recepcion = nodeId("credito", "recepcion");
		String verificacion = nodeId("credito", "verificacion");
		String datosCompletos = nodeId("credito", "datos-completos");
		String notificarCliente = nodeId("credito", "notificar-cliente");
		String fork = nodeId("credito", "fork");
		String analisisLegal = nodeId("credito", "analisis-legal");
		String evalRiesgo = nodeId("credito", "evaluacion-riesgo");
		String historial = nodeId("credito", "historial");
		String join = nodeId("credito", "join");
		String montoMayor = nodeId("credito", "monto-mayor");
		String aprobDireccion = nodeId("credito", "aprob-direccion");
		String aprobRiesgos = nodeId("credito", "aprob-riesgos");
		String aprobado = nodeId("credito", "aprobado");
		String notificarRechazo = nodeId("credito", "notificar-rechazo");
		String contrato = nodeId("credito", "contrato");
		String firmaDesembolso = nodeId("credito", "firma-desembolso");
		String endOk = nodeId("credito", "end-ok");
		String endNo = nodeId("credito", "end-no");

		List<NodoPolitica> nodos = List.of(
				nodo(start, TipoNodo.START, "Inicio", 40, 220, null, null),
				nodo(recepcion, TipoNodo.ACTIVIDAD, "Recepción de solicitud", 220, 220, ac, 60),
				nodo(verificacion, TipoNodo.ACTIVIDAD, "Verificación de datos", 420, 220, vt, 60),
				nodo(datosCompletos, TipoNodo.DECISION, "¿Datos completos?", 620, 220, null, null),
				nodo(notificarCliente, TipoNodo.ACTIVIDAD, "Notificar al cliente", 820, 340, ac, 60),
				nodo(fork, TipoNodo.FORK_BAR, "Paralelo", 820, 140, null, null),
				nodo(analisisLegal, TipoNodo.ACTIVIDAD, "Análisis legal", 1020, 60, legal, 60),
				nodo(evalRiesgo, TipoNodo.ACTIVIDAD, "Evaluación de riesgo", 1020, 140, riesgos, 60),
				nodo(historial, TipoNodo.ACTIVIDAD, "Revisión de historial", 1020, 220, vt, 60),
				nodo(join, TipoNodo.JOIN_BAR, "Unir", 1220, 140, null, null),
				nodo(montoMayor, TipoNodo.DECISION, "¿Monto > $50,000?", 1420, 140, null, null),
				nodo(aprobDireccion, TipoNodo.ACTIVIDAD, "Aprobación Dirección", 1620, 80, direccion, 60),
				nodo(aprobRiesgos, TipoNodo.ACTIVIDAD, "Aprobación Riesgos", 1620, 200, riesgos, 60),
				nodo(aprobado, TipoNodo.DECISION, "¿Aprobado?", 1820, 140, null, null),
				nodo(notificarRechazo, TipoNodo.ACTIVIDAD, "Notificar rechazo", 2020, 240, ac, 60),
				nodo(contrato, TipoNodo.ACTIVIDAD, "Generación de contrato", 2020, 80, legal, 60),
				nodo(firmaDesembolso, TipoNodo.ACTIVIDAD, "Firma y desembolso", 2220, 80, direccion, 60),
				nodo(endOk, TipoNodo.END, "Fin", 2420, 80, null, null),
				nodo(endNo, TipoNodo.END, "Fin", 2220, 240, null, null));

		List<AristaPolitica> aristas = List.of(
				arista(start, recepcion, null),
				arista(recepcion, verificacion, null),
				arista(verificacion, datosCompletos, null),
				arista(datosCompletos, fork, "Sí"),
				arista(datosCompletos, notificarCliente, "No"),
				arista(notificarCliente, verificacion, null),
				arista(fork, analisisLegal, null),
				arista(fork, evalRiesgo, null),
				arista(fork, historial, null),
				arista(analisisLegal, join, null),
				arista(evalRiesgo, join, null),
				arista(historial, join, null),
				arista(join, montoMayor, null),
				arista(montoMayor, aprobDireccion, "Sí"),
				arista(montoMayor, aprobRiesgos, "No"),
				arista(aprobDireccion, aprobado, null),
				arista(aprobRiesgos, aprobado, null),
				arista(aprobado, contrato, "Sí"),
				arista(aprobado, notificarRechazo, "No"),
				arista(notificarRechazo, endNo, null),
				arista(contrato, firmaDesembolso, null),
				arista(firmaDesembolso, endOk, null));

		return politica("Proceso para solicitar un crédito financiero, con análisis legal, evaluación de riesgo, revisión de historial y aprobación según el monto.", nodos, aristas);
	}

	private Politica politica(String subtitulo, List<NodoPolitica> nodos, List<AristaPolitica> aristas) {
		return Politica.builder()
				.subtitulo(subtitulo)
				.nodos(new ArrayList<>(nodos))
				.aristas(new ArrayList<>(aristas))
				.callesDiseno(new ArrayList<>())
				.build();
	}

	private String requireDepartamentoId(Map<String, String> deptIds, String nombre) {
		String id = deptIds.get(nombre);
		if (id == null || id.isBlank()) {
			throw new IllegalStateException("No se encontró departamento requerido: " + nombre);
		}
		return id;
	}

	private boolean containsDepartamento(Map<String, Departamento> existentesPorNombre, String nombre) {
		return existentesPorNombre.keySet().stream().anyMatch(n -> n != null && n.equalsIgnoreCase(nombre));
	}

	private NodoPolitica nodo(
			String id,
			TipoNodo tipo,
			String etiqueta,
			double x,
			double y,
			String departamentoId,
			Integer slaMinutos) {
		return NodoPolitica.builder()
				.id(id)
				.tipo(tipo)
				.etiqueta(etiqueta)
				.posicionX(x)
				.posicionY(y)
				.departamentoId(departamentoId)
				.slaMinutos(slaMinutos)
				.build();
	}

	private String nodeId(String prefijo, String nombre) {
		return "seed-" + prefijo + "-" + nombre;
	}

	private AristaPolitica arista(String desde, String hacia, String etiqueta) {
		return AristaPolitica.builder()
				.id(UUID.randomUUID().toString())
				.desdeNodoId(desde)
				.haciaNodoId(hacia)
				.etiqueta(etiqueta)
				.build();
	}

	@FunctionalInterface
	private interface PoliticaFactory {
		Politica build(Map<String, String> deptIds);
	}

	private record UsuarioSeed(String correo, String nombre, String password, RolUsuario rol, String departamentoNombre) {
	}

	private record ClienteSeed(String email, String nombreCompleto, String password, String telefono) {
	}
}
