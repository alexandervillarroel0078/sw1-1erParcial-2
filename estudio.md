Frontend (JSON)
    ↓
Controller → recibe el JSON y lo mapea al DTO
    ↓
Mapper → convierte DTO → Model (entidad real)
    ↓
Service → ejecuta la lógica de negocio
    ↓
Repository → interfaz que habla con MongoDB
    ↓
MongoDB → guarda el documento


DEVUELVE

MongoDB → devuelve el Model
    ↓
Mapper → convierte Model → DTO
    ↓
Controller → devuelve el DTO como JSON al frontend




HTML → ¿Qué se ve?
SCSS → ¿Cómo se ve?
TS → ¿Qué hace?



compara trámites de abril vs mayo
tareas por departamento


Funcionario habla
      ↓
Web Speech API captura el audio → texto
      ↓
Angular manda el texto a ia-service
      ↓
ia-service manda a OpenAI con la lista 
de políticas activas y el texto
      ↓
OpenAI dice "esta política le corresponde"
      ↓
Angular preselecciona esa política 
en el dropdown automáticamente
      ↓
Funcionario confirma o cambia manualmente
      ↓
Spring Boot valida que la política 
existe y está activa antes de crear el trámite

Caso 1 — Debe sugerir política: (HECHO)
Decí: "Necesito solicitar un cambio de medidor porque el mío está dañado"
Esperás: que preseleccione una política y muestre justificación abajo

Caso 2 — Debe decir política no disponible:
Decí: "hola me llamo Juan y me gustan los perros"
Esperás: snack "Política no disponible para esta solicitud. Comuníquese con un funcionario para más información." y justificación abajo

Caso 3 — Debe pedir más detalle:
Decí algo corto como: "hola"
Esperás: snack "Describe mejor la situación" y no llama a la IA







POLITICAS 
1. Solicitud de nuevo servicio
Subtítulo: Proceso para clientes que requieren la contratación o instalación de un nuevo servicio por primera vez.
2. Cambio o actualización de datos
Subtítulo: Proceso para clientes que necesitan modificar información personal, dirección o datos de contacto registrados.
3. Reclamo o queja formal
Subtítulo: Proceso para clientes que desean presentar una queja, reclamo o disconformidad con un servicio recibido.
4. Solicitud de baja o cancelación
Subtítulo: Proceso para clientes que desean cancelar o dar de baja un servicio contratado.
5. Inspección técnica
Subtítulo: Proceso para clientes que reportan fallas, daños o problemas técnicos que requieren visita de un técnico.
6. Solicitud de crédito o financiamiento
Subtítulo: Proceso para clientes que solicitan un plan de pago, crédito o financiamiento para un servicio o deuda.
7. Renovación de contrato
Subtítulo: Proceso para clientes cuyo contrato está por vencer y desean renovar o actualizar sus condiciones.
