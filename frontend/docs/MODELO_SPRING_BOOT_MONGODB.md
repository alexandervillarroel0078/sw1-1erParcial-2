# Análisis de dominio para Spring Boot + MongoDB

Documento derivado del código en `frontend/src/app/`: modelos en `core/models/`, servicios mock en `core/services/`, pantallas admin y funcionario, diseñador de políticas y validaciones de flujo. **No incluye código Java** — solo especificación para implementación posterior.

---

## 1. ENTIDADES Y ATRIBUTOS

Convenciones sugeridas: IDs `String` (ObjectId hex o UUID según estrategia del proyecto). Fechas `Instant` o `LocalDateTime` con zona definida. Enumeraciones Java para los literales TypeScript.

### 1.1 `Departamento`

| Atributo | Tipo Java | MongoDB | Requerido |
|----------|-----------|---------|-----------|
| `id` | `String` | `@Id` | Sí |
| `nombre` | `String` | `@Field("nombre")` | Sí |
| `activo` | `boolean` | `@Field("activo")` | Sí |

- **Clase:** `Departamento`
- **Colección sugerida:** `departamentos`
- **@Document(collection = "departamentos")**

---

### 1.2 `Usuario` (administradores y funcionarios)

| Atributo | Tipo Java | MongoDB | Requerido |
|----------|-----------|---------|-----------|
| `id` | `String` | `@Id` | Sí |
| `nombre` | `String` | `@Field("nombre")` | Sí |
| `correo` | `String` | `@Field("correo")` único | Sí |
| `passwordHash` | `String` | `@Field("password_hash")` | Sí (persistencia; nunca exponer en API) |
| `rol` | `RolUsuario` enum `ADMINISTRADOR`, `FUNCIONARIO` | `@Field("rol")` | Sí |
| `departamentoId` | `String` | `@Field("departamento_id")` | No (obligatorio lógico si `rol == FUNCIONARIO` en reglas de negocio) |
| `activo` | `boolean` | `@Field("activo")` | Sí |
| `creadoEn` | `Instant` | `@Field("creado_en")` | No |

- **Clase:** `Usuario`
- **Colección:** `usuarios`

---

### 1.3 `Cliente`

| Atributo | Tipo Java | MongoDB | Requerido |
|----------|-----------|---------|-----------|
| `id` | `String` | `@Id` | Sí |
| `nombreCompleto` | `String` | `@Field("nombre_completo")` | Sí |
| `telefono` | `String` | `@Field("telefono")` | Sí |
| `email` | `String` | `@Field("email")` | No |
| `tokenFcm` | `String` | `@Field("token_fcm")` | No |

- **Clase:** `Cliente`
- **Colección:** `clientes`
- *Nota:* En el mock de “nuevo proceso” el cliente se genera con ID ad-hoc; el backend debería crear el cliente explícitamente o recibir datos y persistirlos.

---

### 1.4 `Politica` y estructuras embebidas

La política agrupa metadatos, grafo de flujo y diseño de calles (swimlanes).

#### Clase contenedora `Politica`

| Atributo | Tipo Java | MongoDB | Requerido |
|----------|-----------|---------|-----------|
| `id` | `String` | `@Id` | Sí |
| `nombre` | `String` | `@Field("nombre")` | Sí |
| `subtitulo` | `String` | `@Field("subtitulo")` | No |
| `colorTema` | `String` | `@Field("color_tema")` | No |
| `activa` | `boolean` | `@Field("activa")` | Sí |
| `fechaCreacion` | `Instant` | `@Field("fecha_creacion")` | No (default al crear) |
| `nodos` | `List<NodoPolitica>` | embebido | No (default vacío) |
| `aristas` | `List<AristaPolitica>` | embebido | No |
| `callesDiseno` | `List<PoliticaCalle>` | embebido | No |
| `orientacionCalles` | `OrientacionCalles` enum `VERTICAL`, `HORIZONTAL` | `@Field("orientacion_calles")` | No |

- **Clase:** `Politica`
- **Colección:** `politicas`

#### `NodoPolitica` (documento embebido, sin `@Id` propio o con id String interno)

| Atributo | Tipo Java | Requerido |
|----------|-----------|-----------|
| `id` | `String` | Sí (identificador estable dentro del grafo) |
| `tipo` | `TipoNodo` enum `START`, `END`, `ACTIVIDAD`, `DECISION`, `FORK_BAR`, `JOIN_BAR` | Sí |
| `etiqueta` | `String` | Sí |
| `posicionX`, `posicionY` | `double` o `int` | Sí |
| `departamentoId` | `String` | No |
| `calleId` | `String` | No (coherencia con `PoliticaCalle.id` en diseño) |
| `ancho`, `alto` | `Double` | No |

#### `AristaPolitica` (embebido)

| Atributo | Tipo Java | Requerido |
|----------|-----------|-----------|
| `id` | `String` | Sí |
| `desdeNodoId` | `String` | Sí |
| `haciaNodoId` | `String` | Sí |
| `etiqueta` | `String` | No (ramas Sí/No en decisiones) |

#### `PoliticaCalle` (embebido)

| Atributo | Tipo Java | Requerido |
|----------|-----------|-----------|
| `id` | `String` | Sí |
| `nombre` | `String` | Sí |
| `color` | `String` | Sí |
| `orden` | `int` | Sí |
| `departamentoId` | `String` | No |
| `anchoPx`, `altoPx` | `Integer` | No |

---

### 1.5 `FormularioActividad` y `CampoFormulario`

Definidos en `nodo.model.ts`; usados por el diseñador de formularios por actividad.

#### `FormularioActividad`

| Atributo | Tipo Java | MongoDB | Requerido |
|----------|-----------|---------|-----------|
| `id` | `String` | `@Id` | Sí |
| `nodoActividadId` | `String` | `@Field("nodo_actividad_id")` | Sí |
| `politicaId` | `String` | `@Field("politica_id")` | Sí |
| `campos` | `List<CampoFormulario>` | embebido | No |

#### `CampoFormulario` (embebido)

| Atributo | Tipo Java | Requerido |
|----------|-----------|-----------|
| `id` | `String` | No |
| `formularioId` | `String` | Sí |
| `orden` | `int` | Sí |
| `tipo` | enum alineado a TS (`TEXTO_CORTO`, `TEXTO_LARGO`, `SELECT`, `IMAGEN`, `ARCHIVO`, `CHECKBOX`, `FECHA`) | Sí |
| `etiqueta` | `String` | Sí |
| `textoAyuda` | `String` | No |
| `obligatorio` | `boolean` | Sí |
| `opciones` | `List<Object>` o DTO tipado | No |

- **Colección sugerida:** `formularios_actividad` (documento raíz) **o** embebido dentro de `Politica` si se prefiere un único documento por política (más pesado).

---

### 1.6 `Tramite`

| Atributo | Tipo Java | MongoDB | Requerido |
|----------|-----------|---------|-----------|
| `id` | `String` | `@Id` | Sí |
| `politicaId` | `String` | `@Field("politica_id")` | Sí |
| `politicaNombre` | `String` | `@Field("politica_nombre")` | No (denormalizado para listados) |
| `clienteId` | `String` | `@Field("cliente_id")` | Sí |
| `creadoPorUsuarioId` | `String` | `@Field("creado_por_usuario_id")` | No |
| `estado` | enum `INICIADO`, `EN_PROCESO`, `DEMORADO`, `COMPLETADO`, `CANCELADO` | `@Field("estado")` | Sí |
| `esParalelo` | `Boolean` | `@Field("es_paralelo")` | No |
| `creadoEn` | `Instant` | `@Field("creado_en")` | No |
| `actualizadoEn` | `Instant` | `@Field("actualizado_en")` | No |
| `actividadActual` | `String` | `@Field("actividad_actual")` | No |
| `pasoActual`, `totalPasos` | `Integer` | | No |

- **Clase:** `Tramite`
- **Colección:** `tramites`

---

### 1.7 `Tarea`

| Atributo | Tipo Java | MongoDB | Requerido |
|----------|-----------|---------|-----------|
| `id` | `String` | `@Id` | Sí |
| `tramiteId` | `String` | `@Field("tramite_id")` | Sí |
| `nodoFlujoId` | `String` | `@Field("nodo_flujo_id")` | Sí |
| `actividadEtiqueta` | `String` | `@Field("actividad_etiqueta")` | Sí |
| `departamentoTexto` | `String` | `@Field("departamento_texto")` | Sí (denormalizado; puede sustituirse por `departamentoId` + join) |
| `politicaNombre` | `String` | `@Field("politica_nombre")` | Sí |
| `pasoActual`, `totalPasos` | `int` | | Sí |
| `clienteNombre` | `String` | | No |
| `diasAbierto` | `Integer` | | No |
| `transcurrido` | `String` | | No |
| `usuarioAsignadoId` | `String` | | No |
| `estado` | enum `PENDIENTE`, `EN_ATENCION`, `COMPLETADO` | | Sí |
| `completadoA` | `Instant` | | No |
| `duracion` | `String` | | No |

- **Clase:** `Tarea`
- **Colección:** `tareas`

---

### 1.8 `Informe`

| Atributo | Tipo Java | MongoDB | Requerido |
|----------|-----------|---------|-----------|
| `id` | `String` | `@Id` | Sí |
| `tramiteId` | `String` | `@Field("tramite_id")` | Sí |
| `funcionarioId` | `String` | `@Field("funcionario_id")` | Sí |
| `descripcion` | `String` | | Sí |
| `resultado` | `String` | | Sí |
| `observaciones` | `String` | | No |
| `esBorrador` | `boolean` | `@Field("es_borrador")` | Sí |
| `creadoEn` | `Instant` | | No |
| `enviadoEn` | `Instant` | | No |

- **Clase:** `Informe`
- **Colección:** `informes`

---

### 1.9 DTOs de API (no entidades de persistencia)

- **`LoginRequest`:** `correo`, `password` — solo request.
- **`LoginResponse`:** `token` (JWT), `usuario` (sin password).

---

## 2. RELACIONES ENTRE ENTIDADES

| Origen | Destino | Tipo | Cardinalidad | Embebido vs @DBRef |
|--------|---------|------|--------------|-------------------|
| `Usuario` | `Departamento` | referencia por `departamentoId` | N:1 | **Campo String** (`ObjectId`/`UUID` del departamento). Justificación: consultas frecuentes por departamento, actualización de nombre de departamento sin reescribir usuarios si se usa denormalización opcional. |
| `NodoPolitica` | `Departamento` | referencia lógica | N:1 | **String `departamentoId`**. El grafo vive dentro de `Politica`; no conviene @DBRef dentro de subdocumentos para evitar lecturas cruzadas innecesarias en el editor. |
| `PoliticaCalle` | `Departamento` | referencia lógica | N:1 | **String `departamentoId`**. Misma razón. |
| `Politica` | `NodoPolitica`, `AristaPolitica`, `PoliticaCalle` | composición | 1:N embebidos | **Embebidos** en el documento `politica`. Justificación: el diseñador guarda y versiona el diagrama como unidad; transacciones de lectura/escritura atómicas. |
| `Tramite` | `Politica` | referencia | N:1 | **`politicaId` String** (@DBRef opcional; en Mongo suele bastar ID + índice). |
| `Tramite` | `Cliente` | referencia | N:1 | **`clienteId` String**. |
| `Tramite` | `Usuario` | referencia | N:1 | **`creadoPorUsuarioId`** opcional. |
| `Tarea` | `Tramite` | referencia | N:1 | **`tramiteId`**. |
| `Tarea` | `Usuario` | referencia | N:1 | **`usuarioAsignadoId`** opcional hasta asignar. |
| `Tarea` | `NodoPolitica` | referencia lógica | N:1 | **`nodoFlujoId`** apunta al id del nodo dentro de la política del trámite (validar contra snapshot o política actual según regla de negocio). |
| `Informe` | `Tramite`, `Usuario` | referencia | N:1 | **`tramiteId`**, **`funcionarioId`**. |
| `FormularioActividad` | `Politica`, nodo | referencia | N:1 | **`politicaId`** + **`nodoActividadId`**; campos embebidos en el mismo documento o colección separada. |

**N:M** explícitos: no hay en el frontend actual (ej. un usuario no pertenece a varios departamentos en el modelo). Un funcionario podría tener múltiples tareas: **Usuario 1:N Tarea** por `usuarioAsignadoId`.

---

## 3. REPOSITORIOS

### 3.1 `DepartamentoRepository` (`MongoRepository<Departamento, String>`)

- `List<Departamento> findByActivoTrue()` — listados admin y selects.
- `boolean existsByNombreIgnoreCaseAndIdNot(String nombre, String id)` — evitar duplicados al crear/editar.
- Opcional: `Optional<Departamento> findByNombre(String nombre)`.

### 3.2 `UsuarioRepository`

- `Optional<Usuario> findByCorreoIgnoreCase(String correo)` — login.
- `List<Usuario> findByRol(RolUsuario rol)`.
- `List<Usuario> findByDepartamentoIdAndActivoTrue(String departamentoId)` — asignación por departamento / conteos.
- `boolean existsByDepartamentoId(String departamentoId)` — bloquear borrado de departamento con funcionarios (comportamiento actual en UI).

### 3.3 `ClienteRepository`

- `Optional<Cliente> findByEmailIgnoreCase(String email)` — si se deduplica clientes.

### 3.4 `PoliticaRepository`

- `List<Politica> findByActivaTrue()`.
- `List<Politica> findAllByOrderByFechaCreacionDesc()` — listado admin.

### 3.5 `TramiteRepository`

- `List<Tramite> findByEstadoIn(Collection<EstadoTramite> estados)` — monitor/dashboard.
- `List<Tramite> findByPoliticaId(String politicaId)`.
- `List<Tramite> findByPoliticaIdAndEstado(String politicaId, EstadoTramite estado)` — filtros monitor.
- `List<Tramite> findByCreadoPorUsuarioIdOrderByCreadoEnDesc(String userId)`.

### 3.6 `TareaRepository`

- `List<Tarea> findByUsuarioAsignadoIdAndEstadoNot(String usuarioId, EstadoTarea estado)` — bandeja.
- `List<Tarea> findByUsuarioAsignadoId(String usuarioId)` — `getMisTareas`.
- `List<Tarea> findByTramiteId(String tramiteId)` — seguimiento y motor.
- `Optional<Tarea> findByIdAndUsuarioAsignadoId(String id, String usuarioId)` — seguridad como en mock `getTareaById`.

### 3.7 `InformeRepository`

- `List<Informe> findByTramiteIdOrderByCreadoEnDesc(String tramiteId)`.
- `List<Informe> findByFuncionarioId(String funcionarioId)`.

### 3.8 `FormularioActividadRepository` (si es colección separada)

- `Optional<FormularioActividad> findByPoliticaIdAndNodoActividadId(String politicaId, String nodoId)`.

---

## 4. SERVICIOS

### 4.1 `AuthService` / `TokenService`

| Método | Parámetros | Retorno | Lógica principal |
|--------|------------|---------|------------------|
| `login` | `LoginRequest` | `LoginResponse` | Validar correo/password contra hash, usuario activo; emitir JWT con `sub`, `rol`, expiración. |
| `validateToken` | token | claims | Para filtros Spring Security. |

---

### 4.2 `DepartamentoService`

| Método | Parámetros | Retorno | Lógica |
|--------|------------|---------|--------|
| `listarTodos` | — | `List<DepartamentoDTO>` | Orden sugerido por nombre. |
| `crear` | DTO | `Departamento` | Trim nombre, default activo. |
| `actualizar` | `id`, parcial | `Departamento` | Merge campos. |
| `eliminar` | `id` | void | Si `UsuarioRepository.existsByDepartamentoId` → excepción de negocio (alineado a snackbar frontend). |
| `activarDesactivar` | `id` | `Departamento` | Toggle `activo`. |

---

### 4.3 `UsuarioService` / `FuncionarioService` (admin)

| Método | Parámetros | Retorno | Lógica |
|--------|------------|---------|--------|
| `listarFuncionarios` | — | lista | Filtrar por `rol == FUNCIONARIO` o exponer todos según política de producto. |
| `crear` | DTO + password | `Usuario` | Hash password; validar email único; si FUNCIONARIO, exigir `departamentoId`. |
| `actualizar` | `id`, DTO | `Usuario` | No devolver password; opcional cambio de password. |
| `eliminar` | `id` | void | Reglas: no borrar último admin, etc. |

---

### 4.4 `PoliticaService`

| Método | Parámetros | Retorno | Lógica |
|--------|------------|---------|--------|
| `listar` | — | `List<Politica>` | |
| `obtenerPorId` | `id` | `Politica` | 404 si no existe. |
| `crear` | `Politica` | `Politica` | Fecha creación; validar grafo (reglas análogas a `buildValidation` en TS). |
| `actualizar` | `id`, `Politica` | `Politica` | Reemplazar nodos/aristas/calles; validar. |
| `eliminar` | `id` | void | Considerar trámites activos vinculados. |
| `activarDesactivar` | `id` | `Politica` | Toggle `activa`. |

**Validación de grafo (servicio dedicado o util):** un START, un END, actividades con salida, decisiones con aristas etiquetadas Sí/No, nodos no aislados, advertencias por actividad sin departamento o sin SLA si el producto lo exige.

---

### 4.5 `FormularioActividadService`

| Método | Parámetros | Retorno | Lógica |
|--------|------------|---------|--------|
| `obtenerPorPoliticaYNodo` | `politicaId`, `nodoActividadId` | `FormularioActividad` | Para pantalla de diseño/carga de formulario. |
| `guardar` | entidad | persistida | Validar que `nodoActividadId` exista en la política y sea tipo ACTIVIDAD. |

---

### 4.6 `ClienteService`

| Método | Parámetros | Retorno | Lógica |
|--------|------------|---------|--------|
| `crearObtener` | datos alta rápida | `Cliente` | Usado al iniciar trámite desde “nuevo proceso” (nombre, teléfono, email). |

---

### 4.7 `TramiteService`

| Método | Parámetros | Retorno | Lógica |
|--------|------------|---------|--------|
| `listar` | filtros opcionales | `List<Tramite>` | Admin/monitor: todos o por estado/política. |
| `crear` | DTO inicio | `Tramite` | Asociar política activa, cliente, usuario actual; calcular `esParalelo` si la política contiene `FORK_BAR`; inicializar `pasoActual`, `totalPasos`, `actividadActual` según primera actividad del flujo (orden por `posicionX` como en `NuevoProcesoComponent`). **Disparar creación de primera(s) tarea(s)** vía motor de workflow. |
| `obtenerPorId` | `id` | `Tramite` | Con control de acceso. |

---

### 4.8 `TareaService`

| Método | Parámetros | Retorno | Lógica |
|--------|------------|---------|--------|
| `listarMisTareas` | `usuarioId` | `List<Tarea>` | `usuarioAsignadoId` = usuario autenticado. |
| `listarTodas` | — | `List<Tarea>` | Admin / métricas dashboard. |
| `obtenerPorIdSeguro` | `id`, `usuarioId` | `Tarea` | Solo si asignada al usuario (como mock). |
| `atender` | `id`, `usuarioId` | `Tarea` | `estado` → `EN_ATENCION`. |
| `completar` | `id`, `usuarioId` | `Tarea` | `estado` → `COMPLETADO`, timestamps; **invocar motor** para avanzar trámite / crear siguientes tareas / resolver join paralelo. |

---

### 4.9 `InformeService`

| Método | Parámetros | Retorno | Lógica |
|--------|------------|---------|--------|
| `crear` | `Informe` | `Informe` | Set `creadoEn`, `enviadoEn` si no es borrador. |

---

### 4.10 `MetricasDashboardService` (opcional agregación)

- Conteos: trámites no terminal, tareas no completadas, políticas activas, promedio días abiertos — equivalente a `combineLatest` del `DashboardComponent`.

---

### 4.11 `AnalisisPoliticaService` (opcional)

- El módulo análisis usa **mock por política**; un backend real podría exponer agregaciones sobre duración por nodo (`Tarea` completadas + timestamps por `nodoFlujoId` y `politicaId`).

---

## 5. CONTROLADORES Y ENDPOINTS

Prefijo API ejemplo: `/api`. Seguridad: Spring Security + JWT. Roles: `ADMINISTRADOR`, `FUNCIONARIO`.

### 5.1 Auth — `POST /api/auth/login`

- **Body:** `LoginRequest`
- **Respuesta:** `LoginResponse`
- **Rol:** público (sin token previo)

### 5.2 Departamentos — `/api/admin/departamentos`

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` | ADMIN | Listar |
| POST | `/` | ADMIN | Crear |
| PUT/PATCH | `/{id}` | ADMIN | Actualizar |
| DELETE | `/{id}` | ADMIN | Eliminar (con validación funcionarios) |
| PATCH | `/{id}/activar-desactivar` | ADMIN | Toggle activo |

### 5.3 Usuarios / Funcionarios — `/api/admin/usuarios`

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` o `/funcionarios` | ADMIN | Listado |
| POST | `/` | ADMIN | Alta |
| PUT/PATCH | `/{id}` | ADMIN | Actualización |
| DELETE | `/{id}` | ADMIN | Baja |

*(Ajustar rutas para no exponer passwords; DTOs de salida sin `passwordHash`.)*

### 5.4 Políticas — `/api/admin/politicas`

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` | ADMIN | Listar |
| GET | `/{id}` | ADMIN | Detalle (diseñador) |
| POST | `/` | ADMIN | Crear |
| PUT | `/{id}` | ADMIN | Actualizar diagrama completo |
| DELETE | `/{id}` | ADMIN | Eliminar |
| PATCH | `/{id}/activar-desactivar` | ADMIN | Toggle |

**Formularios por actividad** (si se separa):

| GET | `/{politicaId}/nodos/{nodoId}/formulario` | ADMIN | Obtener diseño |
| PUT | `/{politicaId}/nodos/{nodoId}/formulario` | ADMIN | Guardar |

### 5.5 Trámites

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/admin/tramites` | ADMIN | Listado monitor/dashboard |
| GET | `/api/funcionario/tramites/mios` | FUNC | Opcional: creados por el usuario |
| POST | `/api/funcionario/tramites` | FUNC | Iniciar trámite (nuevo proceso): body con `politicaId` + datos cliente |

### 5.6 Tareas

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/funcionario/tareas/mias` | FUNC | Bandeja |
| GET | `/api/funcionario/tareas/{id}` | FUNC | Detalle si asignada al usuario |
| PATCH | `/api/funcionario/tareas/{id}/atender` | FUNC | Marcar en atención |
| PATCH | `/api/funcionario/tareas/{id}/completar` | FUNC | Completar y disparar transición |
| GET | `/api/admin/tareas` | ADMIN | Todas (dashboard) |

### 5.7 Informes

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/funcionario/informes` | FUNC | Crear informe de actividad vinculado a trámite/tarea |

### 5.8 Métricas / análisis (opcional)

| GET | `/api/admin/metricas/dashboard` | ADMIN | KPIs agregados |
| GET | `/api/admin/analisis/politicas/{id}` | ADMIN | Cuellos de botella (si se implementa) |

---

## 6. WORKFLOW ENGINE

Descripción lógica basada en `politica.model` (tipos de nodo y aristas), mocks de `Tramite`/`Tarea`, `nuevo-proceso` (primera actividad, paralelismo) y validación del diseñador.

### 6.1 Interpretación de una política

- El documento `Politica` define un **grafo dirigido**: nodos (`NodoPolitica`) y aristas (`AristaPolitica`).
- Tipos de nodo:
  - **START:** punto de entrada del trámite (único por política en validación UI).
  - **END:** terminal; al alcanzarlo, el trámite pasa a **COMPLETADO**.
  - **ACTIVIDAD:** unidad de trabajo humano; requiere **tarea** asignable a un departamento (`departamentoId` en el nodo o reglas de calle/swimlane en diseño).
  - **DECISION:** bifurcación; las aristas salientes deben distinguirse por **etiqueta** (normalizada a Sí/No según validación frontend).
  - **FORK_BAR:** inicio de **ramas paralelas**; varias aristas salientes activas a la vez.
  - **JOIN_BAR:** **sincronización** — el flujo continúa solo cuando **todas** las ramas que convergen en el join han llegado (tareas previas completadas).

- **Estado de ejecución del trámite** debe guardar al menos:
  - Nodo(s) actual(es) o conjunto de tokens activos (en paralelo hay varios caminos).
  - Para JOIN: contador de ramas completadas / pendientes.

### 6.2 Enrutamiento de tareas

1. Al **iniciar trámite**, el motor localiza el nodo **START**, sigue aristas hasta la primera **ACTIVIDAD** (o varias si hay fork inmediato) y crea **Tarea**(s) con `nodoFlujoId`, `tramiteId`, textos denormalizados (`actividadEtiqueta`, `politicaNombre`, `departamentoTexto` desde `Departamento`).
2. Al **completar una tarea**:
   - Marcar tarea `COMPLETADO`.
   - Obtener aristas salientes del `nodoFlujoId` desde la política del trámite.
   - Si el nodo es **DECISION**, filtrar arista según **resultado** devuelto por la UI/API (la completación de tarea debería incluir la rama elegida o derivarse de datos del informe).
   - Si es **ACTIVIDAD** simple con una sola salida, avanzar al siguiente nodo.
   - Si el siguiente nodo es otra **ACTIVIDAD**, crear nueva **Tarea**.
   - Si es **END**, cerrar trámite.
   - Si es **FORK_BAR**, crear una tarea por cada arista saliente hacia actividades (o encolar tokens).
   - Si es **JOIN_BAR**, registrar finalización de la rama; cuando todas las entradas esperadas estén satisfechas, avanzar por la arista de salida del join.

3. **Orden de actividades** en el frontend para “paso X de Y” se basa en actividades ordenadas por `posicionX`; el motor puede calcular `totalPasos` como número de nodos ACTIVIDAD o una métrica de progreso coherente con paralelismo.

### 6.3 Flujos paralelos

- **FORK_BAR →** varias ramas simultáneas: varias **Tarea** abiertas con el mismo `tramiteId` pero distinto `nodoFlujoId` (como en mock `tra-2` con tareas `r4` y `r5`).
- **JOIN_BAR:** el motor no debe crear la tarea posterior al join hasta que **todas** las ramas incidentes hayan completado su última actividad antes del join.
- `Tramite.esParalelo` puede calcularse al crear el trámite si la política contiene algún `FORK_BAR` (como en `NuevoProcesoComponent`).

### 6.4 Asignación de funcionarios por departamento

- Cada **ACTIVIDAD** tiene `departamentoId` opcional en el modelo persistido.
- **Asignación sugerida:**
  1. Resolver `departamentoId` del nodo actual.
  2. Buscar **usuarios** con `rol = FUNCIONARIO`, `activo = true`, `departamentoId` coincidente.
  3. Estrategia: round-robin, carga mínima de tareas pendientes, o asignación manual reservada para una fase posterior.
  4. Si no hay candidatos, crear tarea en estado pendiente sin `usuarioAsignadoId` o lanzar alerta operativa según reglas de negocio.
- Los **administradores** pueden no tener `departamentoId` en el modelo actual; no recibirían tareas de cola por departamento salvo regla explícita.

### 6.5 Coherencia con swimlanes (`PoliticaCalle`)

- Las calles en diseño son **metadatos de UI** y referencia opcional `departamentoId`; el motor de ejecución debería basarse en **`departamentoId` del nodo ACTIVIDAD** persistido al guardar la política (el editor puede sincronizar calle ↔ departamento). No es obligatorio persistir `calleId` en runtime si `departamentoId` está definido.

---

## 7. RESUMEN DE COBERTURA FRONTEND → BACKEND

| Área frontend | Entidades / APIs implicadas |
|---------------|----------------------------|
| Login | `Auth`, `Usuario` |
| Admin departamentos | `Departamento` |
| Admin funcionarios | `Usuario` |
| Lista / editor políticas | `Politica` (+ validación grafo) |
| Diseñador formulario actividad | `FormularioActividad`, `CampoFormulario` |
| Dashboard admin | `Tramite`, `Tarea`, `Politica` (agregados) |
| Monitor | `Tramite` (filtros estado/política) |
| Análisis | Agregaciones (mock hoy) |
| Bandeja funcionario | `Tarea` por usuario |
| Nuevo proceso | `Cliente`, `Tramite`, motor workflow |
| Reporte actividad / informe | `Informe`, `Tarea` |

---

*Documento generado como insumo para implementación Spring Data MongoDB + Spring Security; ajustar nombres de paquetes, DTOs y estrategia de IDs (ObjectId vs UUID) según estándar del equipo.*
