cd backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

cd backend
mvn spring-boot:run

cd frontend
ng serve

ng serve --configuration=local --host 0.0.0.0

cd ml-service
python main.py

cd ia-service
python main.py

// para poder usar s3 en local
cd C:\minio
.\minio.windows-amd64.RELEASE.2025-09-07T16-13-09Z.exe server C:\minio\data --console-address ":9001"

git add .
git commit -m "credenciales de cada nodo y repositorio"
git push origin main2


rmdir venv -Recurse -Force
python -m venv venv

http://localhost:9001
Login con minioadmin / minioadmin

flowgov-docs


pip freeze > requirements.txt

pip install -r requirements.txt
 
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


✅ Repositorio de documentos por trámite
✅ Subida de cualquier formato
✅ Visualización dentro del flujo
✅ Permisos por nodo (sin acceso / solo ver / ver y modificar / acceso completo)
✅ Auditoría de accesos y modificaciones
✅ AWS S3 (MinIO local → migrar a AWS después)
✅ Asignación automática de política por voz
✅ Llenado de formulario por voz (ya existía)
✅ Reportes por lenguaje natural
✅ TensorFlow predicciones

