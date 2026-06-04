"""
Microservicio FastAPI: generación y edición de diagramas de flujo vía OpenAI.
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.openai_client import MODEL
from routers import diagrama, documentos, formulario, politica, reportes

load_dotenv()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")

app = FastAPI(title="IA Diagramas", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diagrama.router)
app.include_router(formulario.router)
app.include_router(politica.router)
app.include_router(reportes.router)
app.include_router(documentos.router)


@app.get("/health")
def health():
    return {"status": "ok", "modelo": MODEL}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
