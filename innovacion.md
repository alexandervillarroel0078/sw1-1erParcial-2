# Guia de navegacion de codigo para explicar en vivo

Esta guia esta pensada para abrir archivos en orden y contar el flujo de extremo a extremo al ing.

## 1) Crear un tramite

1. **Abrir primero:** `frontend/src/app/funcionario/nuevo-proceso/nuevo-proceso.component.ts`  
   **Metodo a mostrar:** `iniciarTramite()`
2. **Ir despues a:** `frontend/src/app/core/services/tramite.service.ts`  
   **Metodo:** `crearTramite(...)`
3. **Luego:** `backend/src/main/java/com/dpn/backend/controller/TramiteController.java`  
   **Metodo:** `crear(...)`
4. **Luego:** `backend/src/main/java/com/dpn/backend/service/TramiteService.java`  
   **Metodo:** `crear(...)`
5. **Cerrar el flujo en:** `backend/src/main/java/com/dpn/backend/service/WorkflowEngine.java`  
   **Metodo:** `iniciarTramite(...)`

**Orden para mostrar:** click en UI -> service frontend -> controller backend -> service backend -> workflow engine crea primeras tareas.

---

## 2) WorkflowEngine ejecutando un flujo

1. **Abrir primero:** `backend/src/main/java/com/dpn/backend/service/WorkflowEngine.java`  
   **Metodo principal:** `iniciarTramite(...)`
2. **Seguir en el mismo archivo:**  
   **Metodo clave:** `expandirDesdeNodo(...)`
3. **Mostrar creacion de tareas humanas:**  
   **Metodo:** `crearTareaActividad(...)`
4. **Mostrar avance al completar tarea:**  
   **Metodo:** `avanzarFlujo(...)`
5. **Si preguntan por decisiones/paralelo:**  
   **Metodos:** `expandirDesdeNodoDecisionConRama(...)` y `puedeAvanzarJoinBar(...)`

**Orden para mostrar:** inicio -> expansion por tipo de nodo -> creacion de tareas -> avance del tramite -> manejo de ramas/paralelos.

---

## 3) Login JWT

1. **Abrir primero:** `frontend/src/app/auth/login/login.component.ts`  
   **Metodo:** `submit()`
2. **Ir despues a:** `frontend/src/app/core/services/auth.service.ts`  
   **Metodo:** `login(...)`
3. **Luego:** `backend/src/main/java/com/dpn/backend/controller/AuthController.java`  
   **Metodo:** `login(...)`
4. **Luego:** `backend/src/main/java/com/dpn/backend/service/AuthService.java`  
   **Metodo:** `login(...)`
5. **Cerrar en:** `backend/src/main/java/com/dpn/backend/security/JwtUtil.java`  
   **Metodo:** `generateToken(...)`

**Orden para mostrar:** formulario -> llamada API -> validacion credenciales/rol -> generacion JWT -> guardado token en frontend.

---

## 4) Formulario dinamico

1. **Abrir primero (diseno admin):** `frontend/src/app/admin/politicas/formulario-designer/formulario-designer.component.ts`  
   **Metodo:** `guardarFormulario()`
2. **Ir despues a:** `frontend/src/app/core/services/politica.service.ts`  
   **Metodo:** `putFormularioActividad(...)`
3. **Backend receptor:** `backend/src/main/java/com/dpn/backend/controller/PoliticaController.java`  
   **Metodo:** `guardarFormulario(...)`
4. **Persistencia:** `backend/src/main/java/com/dpn/backend/service/FormularioActividadService.java`  
   **Metodo:** `guardar(...)`
5. **Luego mostrar llenado funcionario:** `frontend/src/app/funcionario/reporte-actividad/reporte-actividad.component.ts`  
   **Metodo:** `rebuildForm(...)`
6. **Mostrar carga de definicion para funcionario:**  
   - `frontend/src/app/core/services/formulario-funcionario.service.ts` -> `obtener(...)`  
   - `backend/src/main/java/com/dpn/backend/controller/FuncionarioFormularioController.java` -> `obtener(...)`

**Orden para mostrar:** admin define y guarda -> backend persiste -> funcionario abre tarea -> se reconstruye y llena formulario dinamico.

---

## 5) IA con voz

1. **Abrir primero:** `frontend/src/app/funcionario/reporte-actividad/reporte-actividad.component.ts`  
   **Secuencia de metodos:** `iniciarGrabacion()` -> evento `onend` -> `iaService.rellenarFormulario(...)`
2. **Ir despues a:** `frontend/src/app/core/services/ia.service.ts`  
   **Metodo:** `rellenarFormulario(...)`
3. **Ir al microservicio:** `ia-service/main.py`  
   **Endpoint:** `rellenar_formulario(...)`
4. **Mostrar llamada al modelo:** `ia-service/main.py`  
   **Metodo:** `_llamada_openai_formulario(...)` con `MODEL = "gpt-4o-mini"`
5. **Volver al frontend:** `frontend/src/app/funcionario/reporte-actividad/reporte-actividad.component.ts`  
   **Metodo:** `aplicarValoresDesdeIa(...)`

**Orden para mostrar:** voz -> transcripcion -> request IA -> OpenAI -> valores de campos -> formulario autocompletado.

---

## 6) Colaborativo WebSocket

1. **Abrir primero:** `frontend/src/app/admin/politicas/policy-designer/policy-designer.component.ts`  
   **Mostrar:** `colaborativoService.conectar(...)`, `colaborativoService.enviarCambio(...)`, `aplicarCambioRemoto(...)`
2. **Ir despues a:** `frontend/src/app/core/services/colaborativo.service.ts`  
   **Metodos:** `conectar(...)`, `enviarCambio(...)`, `onCambioRecibido(...)`
3. **Backend configuracion WS:** `backend/src/main/java/com/dpn/backend/config/WebSocketConfig.java`  
   **Metodos:** `configureMessageBroker(...)`, `registerStompEndpoints(...)`
4. **Backend broadcast:** `backend/src/main/java/com/dpn/backend/controller/ColaborativoController.java`  
   **Metodo:** `reenviarCambio(...)`
5. **Volver al designer:** `policy-designer.component.ts`  
   **Metodo:** `aplicarCambioRemoto(...)` al recibir en `cambios$`

**Orden para mostrar:** usuario A edita -> publica por `/app` -> backend reenvia a `/topic` -> usuario B recibe y sincroniza canvas.








git clone https://github.com/alexandervillarroel0078/erp-serverless.git