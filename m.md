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
git commit -m "politicas"
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






✅ Login
✅ Dashboard Admin
✅ Políticas
✅ Funcionarios (Admin/Funcionario)
✅ Departamentos (con lista de funcionarios)
✅ Monitor
✅ Análisis
✅ Editor de Políticas
   ✅ Canvas SVG con pan y zoom
   ✅ Nodos arrastrables
   ✅ Conexiones Bézier
   ✅ Panel de propiedades
   ✅ Asistente wizard 3 pasos
   ✅ Pestaña IA con chat
   ✅ Validación del flujo
   ✅ Calles redimensionables
   ✅ Diseñador de formulario
✅ Bandeja Funcionario
✅ Reporte con voz
✅ Nuevo Trámite






cd backend
mvn spring-boot:run

cd frontend
ng serve

ng serve --configuration=local --host 0.0.0.0

git add .
git commit -m "completo flujo de creacion de politicas y funcionario"
git push origin main







START
  ↓
□ Recepción de solicitud        → Atención al Cliente
  ↓
□ Verificación de datos         → Atención al Cliente  
  ↓
◆ ¿Datos completos?
  ↓ Sí                ↓ No
□ Análisis crediticio  □ Devolver al cliente → END
  ↓
═ FORK (paralelo)
  ├── □ Revisión jurídica       → Jurídico
  └── □ Evaluación de riesgo    → Validación Técnica
═ JOIN
  ↓
□ Aprobación final              → Dirección
  ↓
◎ END