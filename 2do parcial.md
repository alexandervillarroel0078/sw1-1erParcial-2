# 2do Examen Parcial — FlowGov (Ciclo 2)

Este parcial es una continuación directa del primero. Todo lo que se construyó en el Ciclo 1 sigue existiendo, y encima se agregan mejoras. Es un proceso completo de desarrollo de software, con todos los pasos: análisis, diseño, implementación, pruebas, despliegue.

---

## Mejora 1 — Sistema de Gestión Documental

Se agrega un repositorio de documentos a la aplicación. La regla principal es: cada trámite tiene su propio repositorio, no hay uno global para toda la política de negocio. Es como que cada trámite lleva su propia carpeta, y esa carpeta lo acompaña a donde vaya dentro del flujo.

Los documentos pueden ser de cualquier formato: PDFs, Word, imágenes, etc. Se pueden subir y visualizar desde dentro del flujo de la política de negocio.

Al momento de crear la política de negocio, se define quién puede hacer qué con los documentos de cada nodo:
- Solo ver
- Ver y modificar
- Acceso completo
- Sin acceso (ese punto del flujo no ve ningún documento)

Se debe llevar un registro (auditoría) de quién accedió y quién modificó cada documento.

La edición documental tiene que ser colaborativa en tiempo real, porque puede haber más de un funcionario trabajando sobre el mismo trámite al mismo tiempo, y ambos podrían estar viendo el mismo documento simultáneamente. Para esto no es necesario construir un editor propio, se pueden usar servicios externos que ya lo resuelven.

Todo el almacenamiento de documentos va en AWS S3, no local.

---

## Mejora 2 — IA para llenado de formularios por voz

Cada punto de atención del flujo tiene un formulario. Hasta ahora el usuario llenaba ese formulario a mano. Ahora el sistema tiene que permitir que el usuario hable, y a partir de ese audio, llenar el formulario automáticamente.

El proceso es: el usuario graba audio describiendo su situación → el sistema convierte el audio a texto → analiza ese texto con NLP/LLM → mapea lo que dijo a los campos del formulario → llena el formulario.

La precisión tiene que ser casi del 100%. No es simplemente transcribir el audio y guardarlo como texto. Hay que entender lo que dijo, identificar qué campo corresponde a qué parte del discurso, y colocar el valor correcto. El formulario puede tener muchos campos de distintos tipos.

---

## Mejora 3 — IA para asignación automática de política de negocio

Antes, cuando un cliente llegaba a solicitar algo (por ejemplo, cambiar de nombre, solicitar un medidor, etc.), era un funcionario quien manualmente decidía qué política de negocio asignarle.

Ahora eso se automatiza. El cliente, desde su casa usando la aplicación móvil, describe su situación por voz. El sistema analiza ese audio y determina automáticamente qué política de negocio corresponde asignarle. El número de políticas de negocio existentes es configurable, el sistema no asume cuántas hay.

Opcionalmente se puede agregar un paso donde un funcionario aprueba la asignación antes de hacerla efectiva.

---

## Mejora 4 — IA para generación de reportes por lenguaje natural

El administrador que gestiona las políticas de negocio quiere sacar reportes, pero no se sabe de antemano qué tipo de reportes va a necesitar. Entonces los reportes se construyen de forma dinámica.

El administrador escribe o habla en lenguaje natural lo que necesita, por ejemplo: "necesito los trámites atendidos entre tal y tal fecha por el departamento técnico". El sistema toma ese texto, lo analiza, construye una consulta, la ejecuta en la base de datos y devuelve el resultado como reporte.

---

## Mejora 5 — TensorFlow: monitoreo inteligente en el Dashboard

El dashboard que ya existe se extiende con análisis predictivo usando TensorFlow o herramienta equivalente de deep learning:
- Predicción de riesgo de demora en trámites en curso
- Recomendaciones de prioridad (qué trámites atender antes)
- Detección de anomalías en el flujo de procesos

---

## Stack y requisitos técnicos

- Frontend: Angular 21
- Base de datos: MongoDB
- IA/NLP: microservicio en Python/FastAPI
- Almacenamiento: AWS S3 como servicio real, no solo deploy
- Documentación completa igual que Ciclo 1

## Fechas

- Entrega: 11 de Junio, 16:00h
- Presentación: aproximadamente 2 semanas después

## CLASE #2

Les voy a publicar dos importantes. Eso implica un incremento en todo, en todo significa por lo menos los siguientes puntos:

Primero, en el proceso de desarrollo, es un nuevo ciclo.
Dos, es un incremento también en el software, porque es la funcionalidad que han introducido y también algunos ajustes que seguramente van a hacer.
Tres, se supone que también es la documentación.

El software prácticamente está definido, ya lo hemos comentado en el caso anterior. El proceso también, porque lo hemos dicho antes, lo que tenemos que hacer es aplicar el nuevo ciclo y obviamente colocar toda la documentación que se haya generado.

Parte 1 — Fundamentación Teórica
En la fundamentación teórica van a colocar todos los temas que se han tratado en los primeros parciales. Es decir, desde arquitectura de software, desarrollo de software, etc. Esos puntos tienen que ir. Los mismos puntos van a ir, pero vamos a agregar nuevos:
1. Sistema de Gestión Documental
Todo referente a lo más esencial dentro del ámbito de los sistemas de gestión documental. Porque se supone que dentro del software que estamos desarrollando hay algo que tiene que ver con eso. Hablen de lo que está aplicado en el proyecto.
2. Deep Learning
Pero no hablen de todo lo que es Deep Learning. Hablen de lo que está aplicado en el proyecto. Por ejemplo, seguramente van a hablar de NLP, procesamiento de texto. Seguramente también van a hablar de alguna herramienta o componente que se va a utilizar.
3. Infraestructura basada en AWS
Por lo menos tienen que hacerse especialistas en los siguientes servicios:

Elastic Beanstalk — para desplegar aplicaciones (obligatorio)
S3 — con todas sus características (obligatorio)
Base de datos en AWS / RDS — opcional

Ustedes pueden agregar otros temas si les es conveniente, de acuerdo a lo que hayan realizado.

Parte 2 — Proceso de Desarrollo
El proceso de desarrollo está basado en dos ciclos. La documentación tiene que mostrar los dos ciclos:

El primer ciclo, que hicieron en el primer parcial.
El segundo ciclo, que están haciendo ahora.

Todo lo que es la arquitectura lo van a modelar utilizando C4. Todo lo demás — diagramas, etc. — lo van a modelar utilizando UML 2.5.

Parte 3 — Mecanismo de soporte al usuario
Todo mecanismo que consideren conveniente para lograr que los usuarios utilicen correctamente la aplicación. Habíamos planteado varias opciones:

Desde lo más básico: manual de usuario
Pasando por tutoriales
Llegando a lo más óptimo: un asistente para dar soporte, monitoreando lo que está haciendo el usuario para asistirlo


Recomendaciones
En la sección de recomendaciones van a colocar todo lo que han utilizado — 100% de las herramientas, todos los modelos. Bien descrito. Todo debe funcionar en línea.
En la carátula van a colocar los nombres del equipo, y también links para:

Acceder a su código en el repositorio
Acceder a sus tutoriales (deberían tenerlo)


Entrega

Fecha límite: día 11, hasta las 8:00 a.m.
No tienen que imprimir el documento completo, solo las características de la documentación.
El proyecto debe estar accesible en línea. La aplicación móvil va a estar disponible en un Drive para descargar.









 ✅ Ya tenés hecho

Diagrama de políticas por voz
Llenado de formulario por voz (~80%)
Edición colaborativa en tiempo real
WebSocket STOMP notificaciones
Análisis de cuellos de botella (estadístico)
Dashboard con KPIs
Autenticación JWT
Gestión de usuarios, departamentos, funcionarios
Motor de workflow (WorkflowEngine)
Subida de archivos con GridFS
App móvil Flutter para clientes
Asignación manual de política al crear trámite


❌ Falta hacer (parcial 2)
1. Asignación automática de política por voz (HECHO)

Endpoint nuevo en ia-service
Flujo de voz en nuevo-proceso.component.ts
Validación en TramiteService

2. Reportes por lenguaje natural (HECHO)

Nuevo router en ia-service
Text-to-query sobre datos existentes
Componente nuevo en Angular admin/

3. Gestión documental con AWS S3

Migrar GridFS → S3
Repositorio de documentos por trámite
Control de permisos por nodo
Auditoría de accesos y modificaciones
Edición colaborativa (servicio externo)

4. TensorFlow — predicciones

Nuevo ml-service separado
Modelo de riesgo de demora
Recomendaciones de prioridad
Detección de anomalías
Integración en dashboard