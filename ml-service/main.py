"""
Microservicio ML: predicciones con TensorFlow para FlowGov
Puerto: 8001
"""
import os
import pickle
import numpy as np
from datetime import datetime
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "dpn_workflow")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")

# Cargar modelo y scaler
import tensorflow as tf
modelo = tf.keras.models.load_model("modelo_demora.keras")
with open("scaler.pkl", "rb") as f:
    scaler = pickle.load(f)

app = FastAPI(title="FlowGov ML Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TareaInput(BaseModel):
    tarea_id: str
    dias_abierto: float = Field(default=0)
    sla_minutos: float = Field(default=1440)
    paso_actual: int = Field(default=0)
    total_pasos: int = Field(default=1)

class RiesgoResponse(BaseModel):
    tarea_id: str
    riesgo: str
    probabilidad: float
    recomendacion: str

class TareasPriorizadasResponse(BaseModel):
    tareas: list[dict[str, Any]]

class AnomaliaResponse(BaseModel):
    tramite_id: str
    cliente_nombre: str
    politica_nombre: str
    dias_abierto: int
    promedio_historico: float
    desviacion: float
    estado: str  # ANOMALIA | ADVERTENCIA | NORMAL
    es_anomalia: bool

def predecir_riesgo(dias_abierto: float, sla_minutos: float, paso_actual: int, total_pasos: int) -> tuple[str, float]:
    sla_dias = sla_minutos / 480
    progreso = paso_actual / max(total_pasos, 1)
    ratio = dias_abierto / max(sla_dias, 1)
    X = np.array([[dias_abierto, sla_dias, progreso, ratio]])
    X_scaled = scaler.transform(X)
    prob = float(modelo.predict(X_scaled, verbose=0)[0][0])
    if prob >= 0.7:
        riesgo = "ALTO"
    elif prob >= 0.4:
        riesgo = "MEDIO"
    else:
        riesgo = "BAJO"
    return riesgo, round(prob, 3)

def clasificar_estado_anomalia(dias_abierto: int, promedio_historico: float) -> str:
    """Reglas: >2x promedio = ANOMALIA; >1.5x = ADVERTENCIA; si no = NORMAL."""
    if dias_abierto > promedio_historico * 2.0:
        return "ANOMALIA"
    if dias_abierto > promedio_historico * 1.5:
        return "ADVERTENCIA"
    return "NORMAL"

@app.get("/health")
def health():
    return {"status": "ok", "modelo": "modelo_demora.keras"}

@app.post("/ml/riesgo-demora", response_model=RiesgoResponse)
def riesgo_demora(tarea: TareaInput):
    riesgo, prob = predecir_riesgo(
        tarea.dias_abierto, tarea.sla_minutos,
        tarea.paso_actual, tarea.total_pasos
    )
    recomendaciones = {
        "ALTO": "Atender de inmediato, riesgo crítico de vencimiento de SLA",
        "MEDIO": "Revisar pronto, hay riesgo moderado de demora",
        "BAJO": "En tiempo, continuar con el proceso normal"
    }
    return RiesgoResponse(
        tarea_id=tarea.tarea_id,
        riesgo=riesgo,
        probabilidad=prob,
        recomendacion=recomendaciones[riesgo]
    )

@app.post("/ml/prioridades", response_model=TareasPriorizadasResponse)
def priorizar_tareas(tareas: list[TareaInput]):
    if not tareas:
        raise HTTPException(status_code=400, detail="Lista de tareas vacía")
    resultado = []
    for t in tareas:
        riesgo, prob = predecir_riesgo(
            t.dias_abierto, t.sla_minutos,
            t.paso_actual, t.total_pasos
        )
        resultado.append({
            "tarea_id": t.tarea_id,
            "riesgo": riesgo,
            "probabilidad": prob,
        })
    resultado.sort(key=lambda x: x["probabilidad"], reverse=True)
    return TareasPriorizadasResponse(tareas=resultado)

@app.get("/ml/anomalias", response_model=list[AnomaliaResponse])
def detectar_anomalias():
    try:
        client = MongoClient(MONGO_URL)
        db = client[MONGO_DB]
        tramites = list(db.tramites.find(
            {"estado": {"$in": ["INICIADO", "EN_PROCESO", "DEMORADO"]}},
            {"_id": 1, "cliente_nombre": 1, "politica_nombre": 1, 
             "creado_en": 1, "estado": 1}
        ))
        client.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error MongoDB: {e}")
    
    if not tramites:
        return []
    
    dias_lista = []
    for t in tramites:
        creado = t.get("creado_en")
        if creado:
            dias = (datetime.utcnow() - creado.replace(tzinfo=None)).days
        else:
            dias = 0
        dias_lista.append(dias)
    
    promedio = float(np.mean(dias_lista)) if dias_lista else 0
    std = float(np.std(dias_lista)) if dias_lista else 0

    resultado = []
    for t, dias in zip(tramites, dias_lista):
        estado = clasificar_estado_anomalia(dias, promedio)
        resultado.append(AnomaliaResponse(
            tramite_id=str(t.get("_id", "")),
            cliente_nombre=t.get("cliente_nombre", ""),
            politica_nombre=t.get("politica_nombre", ""),
            dias_abierto=dias,
            promedio_historico=round(promedio, 1),
            desviacion=round(std, 1),
            estado=estado,
            es_anomalia=estado == "ANOMALIA",
        ))
    
    resultado.sort(key=lambda x: x.dias_abierto, reverse=True)
    return resultado

@app.get("/ml/training-history")
def training_history():
    import json
    from pathlib import Path
    history_path = Path("training/history.json")
    if not history_path.exists():
        raise HTTPException(status_code=404, detail="history.json no encontrado")
    with open(history_path) as f:
        return json.load(f)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
