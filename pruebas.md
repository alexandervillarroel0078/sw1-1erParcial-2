Prueba 1 — Texto simple
Escribe en el panel IA:
agrega una actividad llamada "Validar documentos" en el departamento de Jurídico
¿Qué pasa?

Prueba 2 — Texto con conexión
conecta la actividad "Validar documentos" con el nodo final
¿Se conecta correctamente?

Prueba 3 — Texto complejo
agrega una decisión después de "Validar documentos" con dos caminos: Sí va al fin y No vuelve a Validar documentos
¿Lo interpreta bien?

Prueba 6 — Eliminar nodo:
elimina la actividad "Validar documentos"
¿Elimina el nodo y reconecta las aristas correctamente?
Prueba 7 — Flujo complejo de una sola vez:
crea un flujo de aprobación de préstamo con revisión 
de crédito, si aprueba va a desembolso, si no va a 
notificación de rechazo
¿Lo genera completo con gateway y dos ENDs?
Prueba 8 — Modificar existente:
cambia el nombre de la actividad "Recibir documentos" 
a "Recepción y registro de documentos"
¿Modifica solo el nombre sin tocar el resto?
Prueba 9 — Agregar paralelo:
después de "Recibir documentos" agrega un fork con 
tres actividades paralelas: revisión legal, revisión 
financiera y revisión técnica, luego únelas con un join
¿Crea Fork/Join correctamente?