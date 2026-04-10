rmdir venv -Recurse -Force
python -m venv venv


pip freeze > requirements.txt

pip install -r requirements.txt

cd backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

python -m seeds.seed_all
python -m seeds.seed_json

cd frontend
npm start

http://127.0.0.1:8000/docs

git add .
git commit -m "simulando tramites"
git push origin main

SELECT * FROM usuarios;
SELECT * FROM politicas_negocio;
SELECT * FROM politica_usuarios;
SELECT * FROM actividades;
SELECT * FROM flujos;
SELECT * FROM evidencias;
SELECT * FROM monitores_estado;
SELECT * FROM analisis_cuello_botella;


1. presentación → pages (diseño)
2. lógica →  hooks control del comportamiento
3. acceso → api / conexión backend
4. componentes → reutilizables

1. Lo básico de una actividad:
ACTIVIDAD
├── Nombre → "Verificar documentos"
├── Responsable → quién la ejecuta
│                 (persona o cargo)
├── Descripción → qué hace exactamente
└── Resultado → qué produce al terminar

2. Y dependiendo del tipo puede tener:
Si es un PASO NORMAL
└── Formulario → qué datos captura o necesita

Si es una DECISIÓN
├── Condición → "¿Documentos completos?"
├── Camino SÍ → a dónde va si cumple
└── Camino NO → a dónde va si no cumple

Si es el INICIO
└── ¿Quién puede iniciar el trámite?

Si es el FIN
└── ¿Cuál es el resultado final?
        aprobado / rechazado / etc

3. Entonces una actividad completa sería:
Nombre: Verificar documentos
Responsable: Asistente administrativo
Descripción: Revisar que el cliente 
             entregó todos los documentos
Formulario: Lista de documentos requeridos
Resultado: Completo / Incompleto


FORMULARIO → antes de llenarse (diseño)
INFORME    → después de llenarse (resultado)








Premisa.-  usuario solicitan un tramite ( ejemplo: CRE, instalacion de medidor)
Se requiere un workclow para el seguimiento de tramites. Enrutacion de departamento seguna la politica de negocios.
 Se identifican:
 - cuellos de botella
 - tiempos de atencion
 - secuencia, alternativa, iterativo, paralelo

Lo desafiante es para quien o que va ser el sw
se debe tener un motor para el workflow 
diagram de actividades en calles
editor similar a architect 

carga de actividades, departamentos, politicas de negocio, facilidad de uso para seguimientos de actividades 


1ER PARCIAL - INGENIERIA DE SOFTWARE 1 

el ambito es en politica de negocio, donde un usuario pueda generara tramites, poder realizar o armar politicas de negocio entre el cliente y atencion al cliente, estariamos a la necesidad de un workflow, el encargado tendra un papel donde tenga tarea pendientes, procesadas.

el sistema deb soportar muchas politicas de negocios, puede ser secuencial, lineal o multilineal.
Ejemplo: 
  que 2 procesos den 1 proceso


cada nodo es un departamento o persona: el sistema debe soportar muchos negocios

flujo:
  - secuencial
  - alternativo
  - iterativo
  - paralelo

diseñar para que cada politica haga un flujo o una combinacion

entregar al usuario que puede diseñar politicas de negocio
  1. actividades
  2. los responsables de esas actividades
  3. flujo

Diseñador de politicas de negocio
  * carga departamentos de empresas
  * carga actividades 
  * hacer asociacion

el usuario debe ver ele monito: 
  hay estan las actividades que me competen 

  verde: atendido
  rojo: debo atender
  amarillo: estoy atendiendo

// SE VALORARA DEMACIADO LA FACILIDAD DE USO

Critico: el usuario no conoce el diagrama de actividad


Usuario2: administradores

Funcionalidades: 
  - crear politicas de negocio
  - diseñar 
  - guardar, dejar pendiente
  - el define el flujo a seguir 

ejemplo ("banco")

1. departamento de atencion al cliente, el decide cual es la politica de negocio adecuada para el cliente
2. almacenar o debemos registrar 
  - politica de negocio: si no no van saber cual es el proveso que deben seguir
  - trabajo que hace cada funcionario

# INNOVACION

1. 
 - edicion del diagrama natural o colaborativo
 - escribir pront a la ia en texto o audio
 ejemplo:
   * colocar una actividad dentro del departamente o conecta la linea A y b
   * concectar manual o pront (texto "pront" o audio) 
   * la ia no generar diagramas si no que diseña el diagrama con ia 

2. cuando la politica dice viene aca, despues alla y alla en el proceso cada uno teine que hacer su trabajo la herramienta debe construir un formulario para que sea llamado cargando como un informe de cada funcionario cuando realize su trabajo 

el funcionario deberia poder cargar la informacion a ese formulario ya sea un informe textual o lo que el hablo lo entiende y lo llena el formulario automaticamente o manualmente 
 - la herramienta debe ser un formulario al que un funcionario le puede
   cargar informacion

3. encontrar el cuello de botella mediante analisis
en la atencion al cliente en una determinada politica 


