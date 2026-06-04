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
import com.dpn.backend.informe.repository.InformeRepository;
import com.dpn.backend.politica.repository.PoliticaRepository;
import com.dpn.backend.tarea.model.Tarea;
import com.dpn.backend.tarea.model.enums.EstadoTarea;
import com.dpn.backend.tarea.repository.TareaRepository;
import com.dpn.backend.tramite.model.Tramite;
import com.dpn.backend.tramite.model.enums.EstadoTramite;
import com.dpn.backend.tramite.repository.TramiteRepository;
import com.dpn.backend.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
	private final TramiteRepository tramiteRepository;
	private final TareaRepository tareaRepository;
	private final InformeRepository informeRepository;
	private final PasswordEncoder passwordEncoder;

	private static final String POLITICA_ALTA_EMPLEADO = "Alta de empleado";
	private static final String POLITICA_VACACIONES = "Aprobación de vacaciones";
	private static final String POLITICA_CORRECCION_INFORME = "Corrección de informe";
	private static final String POLITICA_ONBOARDING_PROVEEDOR = "Onboarding de proveedor";
	private static final String POLITICA_SOLICITUD_CREDITO = "Solicitud de crédito";
	private static final String PROVEEDOR_FORK_NODO_ID = "seed-proveedor-fork";
	private static final String CREDITO_FORK_NODO_ID = "seed-credito-fork";
	private static final int PROVEEDOR_TOTAL_PASOS = 7;
	private static final int CREDITO_TOTAL_PASOS = 7;

	@Override
	public void run(String... args) {
		Map<String, String> deptIds = ensureDepartamentos();
		boolean changed = false;
		changed |= ensureUsuarios(deptIds);
		changed |= ensureClientes();
		long politicasAntes = politicaRepository.count();
		Map<String, String> politicaIds = ensurePoliticas(deptIds);
		changed |= politicaRepository.count() > politicasAntes;
		changed |= ensureTramitesYTareas(deptIds, politicaIds);
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
				new ClienteSeed("juan@demo.com", "Juan Perez", "cliente_70000001", "70000001"),
				new ClienteSeed("maria@demo.com", "Maria Garcia", "cliente_70000002", "70000002"),
				new ClienteSeed("carlos@demo.com", "Carlos Mendez", "cliente_70000003", "70000003"));

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

	private Map<String, String> ensurePoliticas(Map<String, String> deptIds) {
		createPoliticaIfMissing("Alta de empleado", deptIds, "#0C447C", this::buildPoliticaAltaEmpleado);
		createPoliticaIfMissing("Aprobación de vacaciones", deptIds, "#1F6FEB", this::buildPoliticaVacaciones);
		createPoliticaIfMissing("Corrección de informe", deptIds, "#3A7D44", this::buildPoliticaCorreccionInforme);
		createPoliticaIfMissing(POLITICA_ONBOARDING_PROVEEDOR, deptIds, "#8C4A1F", this::buildPoliticaOnboardingProveedor);
		createPoliticaIfMissing("Solicitud de crédito", deptIds, "#5D2E8C", this::buildPoliticaSolicitudCredito);

		Map<String, String> politicaIds = new LinkedHashMap<>();
		for (Politica p : politicaRepository.findAll()) {
			if (p.getNombre() != null && p.getId() != null) {
				politicaIds.put(p.getNombre(), p.getId());
			}
		}
		return politicaIds;
	}

	private boolean ensureTramitesYTareas(Map<String, String> deptIds, Map<String, String> politicaIds) {
		if (tramiteRepository.count() > 0) {
			return false;
		}

		for (String nombrePolitica : List.of(
				POLITICA_ALTA_EMPLEADO,
				POLITICA_VACACIONES,
				POLITICA_CORRECCION_INFORME,
				POLITICA_ONBOARDING_PROVEEDOR,
				POLITICA_SOLICITUD_CREDITO)) {
			if (politicaIds.get(nombrePolitica) == null || politicaIds.get(nombrePolitica).isBlank()) {
				log.warn("No se encontró la política '{}' para seed de trámites", nombrePolitica);
				return false;
			}
		}

		Cliente juan = clienteRepository.findByEmailIgnoreCase("juan@demo.com").orElse(null);
		Cliente maria = clienteRepository.findByEmailIgnoreCase("maria@demo.com").orElse(null);
		Cliente carlos = clienteRepository.findByEmailIgnoreCase("carlos@demo.com").orElse(null);
		if (juan == null || maria == null || carlos == null) {
			log.warn("Clientes demo incompletos; no se crean trámites demo");
			return false;
		}

		Map<String, String> func = cargarFuncionariosDemo();
		if (func == null) {
			return false;
		}

		String idAlta = politicaIds.get(POLITICA_ALTA_EMPLEADO);
		String idVacaciones = politicaIds.get(POLITICA_VACACIONES);
		String idInforme = politicaIds.get(POLITICA_CORRECCION_INFORME);
		String idProveedor = politicaIds.get(POLITICA_ONBOARDING_PROVEEDOR);
		String idCredito = politicaIds.get(POLITICA_SOLICITUD_CREDITO);

		String funcAc = func.get("ana@demo.com");
		String funcLegal = func.get("legal@demo.com");
		String funcFinanzas = func.get("finanzas@demo.com");
		String funcComercial = func.get("comercial@demo.com");
		String funcVt = func.get("luis@demo.com");
		String funcDireccion = func.get("maria@demo.com");
		String funcRiesgos = func.get("riesgos@demo.com");

		Instant now = Instant.now();
		List<Tarea> todasLasTareas = new ArrayList<>();
		int tramitesCreados = 0;

		// —— 10 COMPLETADO (últimos 60 días) ——
		crearTramiteLinealCompleto(todasLasTareas, idAlta, POLITICA_ALTA_EMPLEADO, juan, funcAc,
				actividadesAltaEmpleado(), now.minus(55, ChronoUnit.DAYS), new int[] { 20, 35, 40, 25 });
		tramitesCreados++;
		crearTramiteLinealCompleto(todasLasTareas, idAlta, POLITICA_ALTA_EMPLEADO, maria, funcAc,
				actividadesAltaEmpleado(), now.minus(48, ChronoUnit.DAYS), new int[] { 15, 30, 45, 20 });
		tramitesCreados++;
		crearTramiteLinealCompleto(todasLasTareas, idVacaciones, POLITICA_VACACIONES, carlos, funcAc,
				actividadesVacacionesLineal(), now.minus(60, ChronoUnit.DAYS), new int[] { 25, 30 });
		tramitesCreados++;
		crearTramiteLinealCompleto(todasLasTareas, idVacaciones, POLITICA_VACACIONES, juan, funcAc,
				actividadesVacacionesLineal(), now.minus(45, ChronoUnit.DAYS), new int[] { 18, 22 });
		tramitesCreados++;
		crearTramiteLinealCompleto(todasLasTareas, idInforme, POLITICA_CORRECCION_INFORME, maria, funcAc,
				actividadesCorreccionInformeLineal(), now.minus(40, ChronoUnit.DAYS), new int[] { 50, 35, 40 });
		tramitesCreados++;
		crearTramiteLinealCompleto(todasLasTareas, idInforme, POLITICA_CORRECCION_INFORME, carlos, funcAc,
				actividadesCorreccionInformeLineal(), now.minus(32, ChronoUnit.DAYS), new int[] { 45, 30, 35 });
		tramitesCreados++;
		crearTramiteProveedorCompleto(todasLasTareas, idProveedor, juan, funcAc, funcLegal, funcFinanzas, funcComercial,
				now.minus(35, ChronoUnit.DAYS), new int[] { 3, 4, 3, 5, 2 });
		tramitesCreados++;
		crearTramiteProveedorCompleto(todasLasTareas, idProveedor, maria, funcAc, funcLegal, funcFinanzas, funcComercial,
				now.minus(42, ChronoUnit.DAYS), new int[] { 5, 90, 8, 12, 5 });
		tramitesCreados++;
		crearTramiteCreditoCompleto(todasLasTareas, idCredito, carlos, funcAc, funcVt, funcLegal, funcRiesgos, funcDireccion,
				now.minus(50, ChronoUnit.DAYS), new int[] { 4, 6, 55, 8, 4, 30, 20 });
		tramitesCreados++;
		crearTramiteCreditoCompleto(todasLasTareas, idCredito, juan, funcAc, funcVt, funcLegal, funcRiesgos, funcDireccion,
				now.minus(38, ChronoUnit.DAYS), new int[] { 3, 5, 40, 7, 6, 25, 18 });
		tramitesCreados++;

		// —— 5 EN_PROCESO (últimos 15 días) ——
		crearTramiteLinealEnProceso(todasLasTareas, idAlta, POLITICA_ALTA_EMPLEADO, carlos, funcAc,
				actividadesAltaEmpleado(), now.minus(10, ChronoUnit.DAYS), 2, new int[] { 12, 18 });
		tramitesCreados++;
		crearTramiteLinealEnProceso(todasLasTareas, idVacaciones, POLITICA_VACACIONES, maria, funcAc,
				actividadesVacacionesLineal(), now.minus(7, ChronoUnit.DAYS), 1, new int[] { 15 });
		tramitesCreados++;
		crearTramiteLinealEnProceso(todasLasTareas, idInforme, POLITICA_CORRECCION_INFORME, juan, funcAc,
				actividadesCorreccionInformeLineal(), now.minus(12, ChronoUnit.DAYS), 2, new int[] { 30, 25 });
		tramitesCreados++;
		crearTramiteProveedorEnProceso(todasLasTareas, idProveedor, carlos, funcAc, funcLegal, funcFinanzas, funcComercial,
				now.minus(5, ChronoUnit.DAYS), new int[] { 4, 5, 6 });
		tramitesCreados++;
		crearTramiteCreditoEnProceso(todasLasTareas, idCredito, maria, funcAc, funcVt, funcLegal, funcRiesgos,
				now.minus(14, ChronoUnit.DAYS), new int[] { 3, 7, 8 });
		tramitesCreados++;

		// —— 3 DEMORADO (> 20 días sin completar) ——
		crearTramiteLinealDemorado(todasLasTareas, idAlta, POLITICA_ALTA_EMPLEADO, juan, funcAc,
				actividadesAltaEmpleado(), now.minus(28, ChronoUnit.DAYS), 1, 38);
		tramitesCreados++;
		crearTramiteLinealDemorado(todasLasTareas, idInforme, POLITICA_CORRECCION_INFORME, maria, funcAc,
				actividadesCorreccionInformeLineal(), now.minus(32, ChronoUnit.DAYS), 1, 42);
		tramitesCreados++;
		crearTramiteProveedorDemorado(todasLasTareas, idProveedor, carlos, funcAc, funcLegal, funcFinanzas, funcComercial,
				now.minus(36, ChronoUnit.DAYS), 40);
		tramitesCreados++;

		// —— 2 INICIADO (últimos 3 días) ——
		crearTramiteLinealIniciado(todasLasTareas, idVacaciones, POLITICA_VACACIONES, juan, funcAc,
				actividadesVacacionesLineal(), now.minus(2, ChronoUnit.DAYS));
		tramitesCreados++;
		crearTramiteCreditoIniciado(todasLasTareas, idCredito, carlos, funcAc, funcVt,
				now.minus(1, ChronoUnit.DAYS));
		tramitesCreados++;

		tareaRepository.saveAll(todasLasTareas);
		log.info("Seed demo: {} trámites y {} tareas creadas", tramitesCreados, todasLasTareas.size());
		return true;
	}

	private Map<String, String> cargarFuncionariosDemo() {
		String[] correos = {
				"ana@demo.com",
				"luis@demo.com",
				"legal@demo.com",
				"maria@demo.com",
				"rrhh@demo.com",
				"redaccion@demo.com",
				"revision@demo.com",
				"finanzas@demo.com",
				"comercial@demo.com",
				"riesgos@demo.com"
		};
		Map<String, String> map = new LinkedHashMap<>();
		for (String correo : correos) {
			String id = usuarioIdPorCorreo(correo);
			if (id == null) {
				log.warn("Funcionario demo incompleto: {}", correo);
				return null;
			}
			map.put(correo, id);
		}
		return map;
	}

	private List<ActividadSeed> actividadesAltaEmpleado() {
		return List.of(
				new ActividadSeed("seed-alta-recibir", "Recibir documentos", "RRHH", "rrhh@demo.com"),
				new ActividadSeed("seed-alta-verificar", "Verificar identidad", "RRHH", "rrhh@demo.com"),
				new ActividadSeed("seed-alta-crear-usuario", "Crear usuario en sistema", "RRHH", "rrhh@demo.com"),
				new ActividadSeed("seed-alta-asignar-equipo", "Asignar equipo", "RRHH", "rrhh@demo.com"));
	}

	private List<ActividadSeed> actividadesVacacionesLineal() {
		return List.of(
				new ActividadSeed("seed-vacaciones-solicitar", "Solicitar vacaciones", "Atención al Cliente", "ana@demo.com"),
				new ActividadSeed("seed-vacaciones-registrar", "Registrar en sistema", "RRHH", "rrhh@demo.com"));
	}

	private List<ActividadSeed> actividadesCorreccionInformeLineal() {
		return List.of(
				new ActividadSeed("seed-informe-redactar", "Redactar informe", "Redacción", "redaccion@demo.com"),
				new ActividadSeed("seed-informe-revisar", "Revisar informe", "Revisión", "revision@demo.com"),
				new ActividadSeed("seed-informe-publicar", "Publicar informe", "Redacción", "redaccion@demo.com"));
	}

	private void crearTramiteLinealCompleto(
			List<Tarea> out,
			String politicaId,
			String politicaNombre,
			Cliente cliente,
			String creadoPorId,
			List<ActividadSeed> actividades,
			Instant tramiteCreado,
			int[] minutosPorPaso) {
		int total = actividades.size();
		ActividadSeed ultima = actividades.get(total - 1);
		Tramite tramite = guardarTramite(politicaId, politicaNombre, cliente, creadoPorId, EstadoTramite.COMPLETADO,
				tramiteCreado, false, null, ultima.etiqueta(), total, total);

		Instant cursor = tramiteCreado;
		int paso = 1;
		for (int i = 0; i < actividades.size(); i++) {
			ActividadSeed a = actividades.get(i);
			cursor = agregarTareaCompletada(out, tramite, politicaId, politicaNombre, total, a.nodoId(), a.etiqueta(),
					a.departamento(), usuarioIdPorCorreo(a.usuarioCorreo()), paso++, null, cursor, minutosPorPaso[i]);
		}
		tramite.setActualizadoEn(cursor);
		tramiteRepository.save(tramite);
	}

	private void crearTramiteLinealEnProceso(
			List<Tarea> out,
			String politicaId,
			String politicaNombre,
			Cliente cliente,
			String creadoPorId,
			List<ActividadSeed> actividades,
			Instant tramiteCreado,
			int actividadesCompletadas,
			int[] minutosCompletados) {
		int total = actividades.size();
		ActividadSeed pendiente = actividades.get(actividadesCompletadas);
		Tramite tramite = guardarTramite(politicaId, politicaNombre, cliente, creadoPorId, EstadoTramite.EN_PROCESO,
				tramiteCreado, false, null, pendiente.etiqueta(), actividadesCompletadas, total);

		Instant cursor = tramiteCreado;
		int paso = 1;
		for (int i = 0; i < actividadesCompletadas; i++) {
			ActividadSeed a = actividades.get(i);
			cursor = agregarTareaCompletada(out, tramite, politicaId, politicaNombre, total, a.nodoId(), a.etiqueta(),
					a.departamento(), usuarioIdPorCorreo(a.usuarioCorreo()), paso++, null, cursor, minutosCompletados[i]);
		}
		out.add(tareaBuilder(tramite, politicaId, politicaNombre, total, pendiente.nodoId(), pendiente.etiqueta(),
				pendiente.departamento(), usuarioIdPorCorreo(pendiente.usuarioCorreo()), paso, null,
				EstadoTarea.PENDIENTE, cursor, null, null));

		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);
	}

	private void crearTramiteLinealDemorado(
			List<Tarea> out,
			String politicaId,
			String politicaNombre,
			Cliente cliente,
			String creadoPorId,
			List<ActividadSeed> actividades,
			Instant tramiteCreado,
			int indiceDemorado,
			int diasAbiertoDemorados) {
		int total = actividades.size();
		ActividadSeed demorada = actividades.get(indiceDemorado);
		Tramite tramite = guardarTramite(politicaId, politicaNombre, cliente, creadoPorId, EstadoTramite.DEMORADO,
				tramiteCreado, false, null, demorada.etiqueta(), indiceDemorado + 1, total);

		Instant cursor = tramiteCreado;
		int paso = 1;
		for (int i = 0; i < indiceDemorado; i++) {
			ActividadSeed a = actividades.get(i);
			cursor = agregarTareaCompletada(out, tramite, politicaId, politicaNombre, total, a.nodoId(), a.etiqueta(),
					a.departamento(), usuarioIdPorCorreo(a.usuarioCorreo()), paso++, null, cursor, 10 + i * 5);
		}
		out.add(tareaBuilder(tramite, politicaId, politicaNombre, total, demorada.nodoId(), demorada.etiqueta(),
				demorada.departamento(), usuarioIdPorCorreo(demorada.usuarioCorreo()), paso, null,
				EstadoTarea.DEMORADO, cursor, null, diasAbiertoDemorados));
		if (indiceDemorado + 1 < actividades.size()) {
			ActividadSeed siguiente = actividades.get(indiceDemorado + 1);
			out.add(tareaBuilder(tramite, politicaId, politicaNombre, total, siguiente.nodoId(), siguiente.etiqueta(),
					siguiente.departamento(), usuarioIdPorCorreo(siguiente.usuarioCorreo()), paso + 1, null,
					EstadoTarea.PENDIENTE, cursor, null, null));
		}

		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);
	}

	private void crearTramiteLinealIniciado(
			List<Tarea> out,
			String politicaId,
			String politicaNombre,
			Cliente cliente,
			String creadoPorId,
			List<ActividadSeed> actividades,
			Instant tramiteCreado) {
		int total = actividades.size();
		ActividadSeed primera = actividades.get(0);
		Tramite tramite = guardarTramite(politicaId, politicaNombre, cliente, creadoPorId, EstadoTramite.INICIADO,
				tramiteCreado, false, null, primera.etiqueta(), 0, total);

		out.add(tareaBuilder(tramite, politicaId, politicaNombre, total, primera.nodoId(), primera.etiqueta(),
				primera.departamento(), usuarioIdPorCorreo(primera.usuarioCorreo()), 1, null,
				EstadoTarea.PENDIENTE, tramiteCreado, null, null));

		tramite.setActualizadoEn(tramiteCreado);
		tramiteRepository.save(tramite);
	}

	private void crearTramiteProveedorCompleto(
			List<Tarea> out,
			String politicaId,
			Cliente cliente,
			String funcAc,
			String funcLegal,
			String funcFinanzas,
			String funcComercial,
			Instant tramiteCreado,
			int[] minutosPorActividad) {
		Tramite tramite = guardarTramite(politicaId, POLITICA_ONBOARDING_PROVEEDOR, cliente, funcAc,
				EstadoTramite.COMPLETADO, tramiteCreado, false, null, "Aprobar proveedor", PROVEEDOR_TOTAL_PASOS,
				PROVEEDOR_TOTAL_PASOS);

		Instant cursor = tramiteCreado;
		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-registrar", "Registrar proveedor", "Atención al Cliente", funcAc, 1, null, cursor,
				minutosPorActividad[0]);

		Instant paraleloInicio = cursor;
		Instant finDocs = agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR,
				PROVEEDOR_TOTAL_PASOS, "seed-proveedor-verificar-docs", "Verificar documentos", "Legal", funcLegal, 3,
				PROVEEDOR_FORK_NODO_ID, paraleloInicio, minutosPorActividad[1]);
		Instant finFin = agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR,
				PROVEEDOR_TOTAL_PASOS, "seed-proveedor-evaluar-finanzas", "Evaluar finanzas", "Finanzas", funcFinanzas, 4,
				PROVEEDOR_FORK_NODO_ID, paraleloInicio, minutosPorActividad[2]);
		Instant finRefs = agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR,
				PROVEEDOR_TOTAL_PASOS, "seed-proveedor-revisar-referencias", "Revisar referencias", "Comercial",
				funcComercial, 5, PROVEEDOR_FORK_NODO_ID, paraleloInicio, minutosPorActividad[3]);
		cursor = maxInstant(finDocs, finFin, finRefs);

		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-aprobar", "Aprobar proveedor", "Atención al Cliente", funcAc, 7, null, cursor,
				minutosPorActividad[4]);

		tramite.setActualizadoEn(cursor);
		tramiteRepository.save(tramite);
	}

	private void crearTramiteProveedorEnProceso(
			List<Tarea> out,
			String politicaId,
			Cliente cliente,
			String funcAc,
			String funcLegal,
			String funcFinanzas,
			String funcComercial,
			Instant tramiteCreado,
			int[] minutosCompletados) {
		Tramite tramite = guardarTramite(politicaId, POLITICA_ONBOARDING_PROVEEDOR, cliente, funcAc,
				EstadoTramite.EN_PROCESO, tramiteCreado, true, PROVEEDOR_FORK_NODO_ID, "Revisar referencias", 5,
				PROVEEDOR_TOTAL_PASOS);

		Instant cursor = tramiteCreado;
		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-registrar", "Registrar proveedor", "Atención al Cliente", funcAc, 1, null, cursor,
				minutosCompletados[0]);

		Instant paraleloInicio = cursor;
		agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-verificar-docs", "Verificar documentos", "Legal", funcLegal, 3, PROVEEDOR_FORK_NODO_ID,
				paraleloInicio, minutosCompletados[1]);
		agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-evaluar-finanzas", "Evaluar finanzas", "Finanzas", funcFinanzas, 4,
				PROVEEDOR_FORK_NODO_ID, paraleloInicio, minutosCompletados[2]);

		out.add(tareaBuilder(tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-revisar-referencias", "Revisar referencias", "Comercial", funcComercial, 5,
				PROVEEDOR_FORK_NODO_ID, EstadoTarea.PENDIENTE, paraleloInicio, null, null));

		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);
	}

	private void crearTramiteProveedorDemorado(
			List<Tarea> out,
			String politicaId,
			Cliente cliente,
			String funcAc,
			String funcLegal,
			String funcFinanzas,
			String funcComercial,
			Instant tramiteCreado,
			int diasAbiertoDemorados) {
		Tramite tramite = guardarTramite(politicaId, POLITICA_ONBOARDING_PROVEEDOR, cliente, funcAc,
				EstadoTramite.DEMORADO, tramiteCreado, true, PROVEEDOR_FORK_NODO_ID, "Verificar documentos", 3,
				PROVEEDOR_TOTAL_PASOS);

		Instant cursor = tramiteCreado;
		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-registrar", "Registrar proveedor", "Atención al Cliente", funcAc, 1, null, cursor, 4);

		Instant paraleloInicio = cursor;
		out.add(tareaBuilder(tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-verificar-docs", "Verificar documentos", "Legal", funcLegal, 3, PROVEEDOR_FORK_NODO_ID,
				EstadoTarea.DEMORADO, paraleloInicio, null, diasAbiertoDemorados));
		out.add(tareaBuilder(tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-evaluar-finanzas", "Evaluar finanzas", "Finanzas", funcFinanzas, 4,
				PROVEEDOR_FORK_NODO_ID, EstadoTarea.DEMORADO, paraleloInicio, null, diasAbiertoDemorados - 2));
		out.add(tareaBuilder(tramite, politicaId, POLITICA_ONBOARDING_PROVEEDOR, PROVEEDOR_TOTAL_PASOS,
				"seed-proveedor-revisar-referencias", "Revisar referencias", "Comercial", funcComercial, 5,
				PROVEEDOR_FORK_NODO_ID, EstadoTarea.PENDIENTE, paraleloInicio, null, null));

		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);
	}

	private void crearTramiteCreditoCompleto(
			List<Tarea> out,
			String politicaId,
			Cliente cliente,
			String funcAc,
			String funcVt,
			String funcLegal,
			String funcRiesgos,
			String funcDireccion,
			Instant tramiteCreado,
			int[] minutos) {
		Tramite tramite = guardarTramite(politicaId, POLITICA_SOLICITUD_CREDITO, cliente, funcAc,
				EstadoTramite.COMPLETADO, tramiteCreado, false, null, "Firma y desembolso", CREDITO_TOTAL_PASOS,
				CREDITO_TOTAL_PASOS);

		Instant cursor = tramiteCreado;
		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-recepcion", "Recepción de solicitud", "Atención al Cliente", funcAc, 1, null, cursor,
				minutos[0]);
		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-verificacion", "Verificación de datos", "Validación Técnica", funcVt, 2, null, cursor,
				minutos[1]);

		Instant paraleloInicio = cursor;
		Instant finLegal = agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO,
				CREDITO_TOTAL_PASOS, "seed-credito-analisis-legal", "Análisis legal", "Legal", funcLegal, 3,
				CREDITO_FORK_NODO_ID, paraleloInicio, minutos[2]);
		Instant finRiesgo = agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO,
				CREDITO_TOTAL_PASOS, "seed-credito-evaluacion-riesgo", "Evaluación de riesgo", "Riesgos", funcRiesgos, 4,
				CREDITO_FORK_NODO_ID, paraleloInicio, minutos[3]);
		Instant finHist = agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO,
				CREDITO_TOTAL_PASOS, "seed-credito-historial", "Revisión de historial", "Validación Técnica", funcVt, 5,
				CREDITO_FORK_NODO_ID, paraleloInicio, minutos[4]);
		cursor = maxInstant(finLegal, finRiesgo, finHist);

		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-contrato", "Generación de contrato", "Legal", funcLegal, 6, null, cursor, minutos[5]);
		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-firma-desembolso", "Firma y desembolso", "Dirección", funcDireccion, 7, null, cursor,
				minutos[6]);

		tramite.setActualizadoEn(cursor);
		tramiteRepository.save(tramite);
	}

	private void crearTramiteCreditoEnProceso(
			List<Tarea> out,
			String politicaId,
			Cliente cliente,
			String funcAc,
			String funcVt,
			String funcLegal,
			String funcRiesgos,
			Instant tramiteCreado,
			int[] minutosCompletados) {
		Tramite tramite = guardarTramite(politicaId, POLITICA_SOLICITUD_CREDITO, cliente, funcAc,
				EstadoTramite.EN_PROCESO, tramiteCreado, true, CREDITO_FORK_NODO_ID, "Revisión de historial", 5,
				CREDITO_TOTAL_PASOS);

		Instant cursor = tramiteCreado;
		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-recepcion", "Recepción de solicitud", "Atención al Cliente", funcAc, 1, null, cursor,
				minutosCompletados[0]);
		cursor = agregarTareaCompletada(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-verificacion", "Verificación de datos", "Validación Técnica", funcVt, 2, null, cursor,
				minutosCompletados[1]);

		Instant paraleloInicio = cursor;
		agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-analisis-legal", "Análisis legal", "Legal", funcLegal, 3, CREDITO_FORK_NODO_ID,
				paraleloInicio, minutosCompletados[2]);
		agregarTareaCompletadaInstant(out, tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-evaluacion-riesgo", "Evaluación de riesgo", "Riesgos", funcRiesgos, 4,
				CREDITO_FORK_NODO_ID, paraleloInicio, minutosCompletados[2]);

		out.add(tareaBuilder(tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-historial", "Revisión de historial", "Validación Técnica", funcVt, 5, CREDITO_FORK_NODO_ID,
				EstadoTarea.PENDIENTE, paraleloInicio, null, null));

		tramite.setActualizadoEn(Instant.now());
		tramiteRepository.save(tramite);
	}

	private void crearTramiteCreditoIniciado(
			List<Tarea> out,
			String politicaId,
			Cliente cliente,
			String funcAc,
			String funcVt,
			Instant tramiteCreado) {
		Tramite tramite = guardarTramite(politicaId, POLITICA_SOLICITUD_CREDITO, cliente, funcAc,
				EstadoTramite.INICIADO, tramiteCreado, false, null, "Recepción de solicitud", 0, CREDITO_TOTAL_PASOS);

		out.add(tareaBuilder(tramite, politicaId, POLITICA_SOLICITUD_CREDITO, CREDITO_TOTAL_PASOS,
				"seed-credito-recepcion", "Recepción de solicitud", "Atención al Cliente", funcAc, 1, null,
				EstadoTarea.PENDIENTE, tramiteCreado, null, null));

		tramite.setActualizadoEn(tramiteCreado);
		tramiteRepository.save(tramite);
	}

	private Tramite guardarTramite(
			String politicaId,
			String politicaNombre,
			Cliente cliente,
			String creadoPorUsuarioId,
			EstadoTramite estado,
			Instant creadoEn,
			boolean esParalelo,
			String nodoDecisionPendienteId,
			String actividadActual,
			int pasoActual,
			int totalPasos) {
		Tramite tramite = Tramite.builder()
				.id(UUID.randomUUID().toString())
				.politicaId(politicaId)
				.politicaNombre(politicaNombre)
				.clienteId(cliente.getId())
				.clienteNombre(cliente.getNombreCompleto())
				.creadoPorUsuarioId(creadoPorUsuarioId)
				.estado(estado)
				.esParalelo(esParalelo)
				.nodoDecisionPendienteId(nodoDecisionPendienteId)
				.actividadActual(actividadActual)
				.pasoActual(pasoActual)
				.totalPasos(totalPasos)
				.creadoEn(creadoEn)
				.actualizadoEn(creadoEn)
				.build();
		return tramiteRepository.save(tramite);
	}

	private Instant agregarTareaCompletada(
			List<Tarea> out,
			Tramite tramite,
			String politicaId,
			String politicaNombre,
			int totalPasos,
			String nodoId,
			String etiqueta,
			String departamentoTexto,
			String usuarioAsignadoId,
			int pasoActual,
			String forkNodoId,
			Instant creadoEn,
			int duracionMinutos) {
		return agregarTareaCompletadaInstant(out, tramite, politicaId, politicaNombre, totalPasos, nodoId, etiqueta,
				departamentoTexto, usuarioAsignadoId, pasoActual, forkNodoId, creadoEn, duracionMinutos);
	}

	private Instant agregarTareaCompletadaInstant(
			List<Tarea> out,
			Tramite tramite,
			String politicaId,
			String politicaNombre,
			int totalPasos,
			String nodoId,
			String etiqueta,
			String departamentoTexto,
			String usuarioAsignadoId,
			int pasoActual,
			String forkNodoId,
			Instant creadoEn,
			int duracionMinutos) {
		Instant completadoEn = creadoEn.plus(duracionMinutos, ChronoUnit.MINUTES);
		out.add(tareaBuilder(tramite, politicaId, politicaNombre, totalPasos, nodoId, etiqueta, departamentoTexto,
				usuarioAsignadoId, pasoActual, forkNodoId, EstadoTarea.COMPLETADO, creadoEn, completadoEn, null));
		return completadoEn;
	}

	private Tarea tareaBuilder(
			Tramite tramite,
			String politicaId,
			String politicaNombre,
			int totalPasos,
			String nodoId,
			String etiqueta,
			String departamentoTexto,
			String usuarioAsignadoId,
			int pasoActual,
			String forkNodoId,
			EstadoTarea estado,
			Instant creadoEn,
			Instant completadoEn,
			Integer diasAbierto) {
		return Tarea.builder()
				.id(UUID.randomUUID().toString())
				.tramiteId(tramite.getId())
				.nodoFlujoId(nodoId)
				.forkNodoId(forkNodoId)
				.actividadEtiqueta(etiqueta)
				.departamentoTexto(departamentoTexto)
				.politicaId(politicaId)
				.politicaNombre(politicaNombre)
				.pasoActual(pasoActual)
				.totalPasos(totalPasos)
				.clienteNombre(tramite.getClienteNombre())
				.tramiteClienteId(tramite.getClienteId())
				.usuarioAsignadoId(usuarioAsignadoId)
				.estado(estado)
				.creadoEn(creadoEn)
				.completadoEn(completadoEn)
				.diasAbierto(diasAbierto)
				.build();
	}

	private String usuarioIdPorCorreo(String correo) {
		return usuarioRepository.findByCorreoIgnoreCase(correo).map(Usuario::getId).orElse(null);
	}

	private static Instant maxInstant(Instant... instants) {
		Instant max = instants[0];
		for (int i = 1; i < instants.length; i++) {
			if (instants[i].isAfter(max)) {
				max = instants[i];
			}
		}
		return max;
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

	private record ActividadSeed(String nodoId, String etiqueta, String departamento, String usuarioCorreo) {
	}

	private record UsuarioSeed(String correo, String nombre, String password, RolUsuario rol, String departamentoNombre) {
	}

	private record ClienteSeed(String email, String nombreCompleto, String password, String telefono) {
	}
}
