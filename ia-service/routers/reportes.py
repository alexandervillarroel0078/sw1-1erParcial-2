from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pymongo import MongoClient

from core.json_utils import _extraer_json
from core.mongo import MONGO_DB, MONGO_URL
from core.openai_client import MODEL, _client

router = APIRouter()

SYSTEM_PROMPT_REPORTE = """Eres un experto en MongoDB que convierte preguntas en lenguaje natural 
a consultas MongoDB (formato Python pymongo).

Las colecciones disponibles son:
- tramites: campos: politica_nombre, cliente_nombre, estado (INICIADO/EN_PROCESO/COMPLETADO/CANCELADO), 
  creado_en (ISODate), actualizado_en, actividad_actual, paso_actual, total_pasos
- tareas: campos: actividad_etiqueta, departamento_texto, politica_nombre, cliente_nombre, 
  estado (PENDIENTE/EN_ATENCION/DEMORADO/COMPLETADO), creado_en, completado_en, dias_abierto

FORMATO DE RESPUESTA (solo esto, sin texto adicional):
{
  "coleccion": "tramites" o "tareas",
  "filtro": {},
  "proyeccion": {},
  "limite": número máximo 100,
  "descripcion": "qué muestra este reporte"
}

Para estado usa exactamente los valores del enum en mayúsculas.
Si la consulta es ambigua elige la colección más apropiada.
Responde SOLO con el JSON.

Para filtros de fecha usa operadores MongoDB:
- Este mes: { $gte: fecha_inicio_mes, $lt: fecha_fin_mes }
- Este año: { $gte: fecha_inicio_año, $lt: fecha_fin_año }
- Rango: { $gte: fecha_inicio, $lt: fecha_fin }
- Última semana: $gte con fecha de hace 7 días
Usa datetime.utcnow() como referencia para fechas relativas.
Las fechas en MongoDB están en UTC como ISODate.

Para filtros de texto en campos como cliente_nombre, politica_nombre usa 
expresiones regulares case-insensitive y sin importar tildes:
{ campo: { $regex: 'valor', $options: 'i' } }
Esto evita problemas con mayúsculas, minúsculas y tildes.

Además del JSON actual, agrega:
- tipo_grafico: si los datos son agrupables devuelve 'pie' para conteos por categoría, 
  'bar' para comparaciones entre grupos, 'line' para datos por fecha. Si no es graficable devuelve null.
- campo_grafico: el nombre del campo que se usará para agrupar (ej: 'estado', 'departamento_texto'). 
  Si tipo_grafico es null, devuelve null."""


class ConsultaReporteBody(BaseModel):
    texto: str = Field(..., min_length=3)


class ConsultaReporteResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    descripcion: str
    columnas: list[str]
    filas: list[dict[str, Any]]
    total: int
    tipo_grafico: str | None = Field(default=None, serialization_alias="tipoGrafico")
    campo_grafico: str | None = Field(default=None, serialization_alias="campoGrafico")


@router.post("/api/ia/consulta-reporte", response_model=ConsultaReporteResponse)
def consulta_reporte(body: ConsultaReporteBody):
    client_openai = _client()
    try:
        completion = client_openai.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_REPORTE},
                {"role": "user", "content": body.texto.strip()},
            ],
            temperature=0.1,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error OpenAI: {e!s}") from e
    choice = completion.choices[0].message.content
    if not choice:
        raise HTTPException(status_code=502, detail="Respuesta vacía del modelo")
    data = _extraer_json(choice)
    coleccion = data.get("coleccion", "tramites")
    filtro = data.get("filtro", {})
    proyeccion = data.get("proyeccion", {})
    limite = min(int(data.get("limite", 20)), 100)
    descripcion = data.get("descripcion", "Resultado de la consulta")
    if proyeccion:
        proyeccion["_id"] = 0
    else:
        proyeccion = {"_id": 0}
    try:
        mongo_client = MongoClient(MONGO_URL)
        db = mongo_client[MONGO_DB]
        col = db[coleccion]
        resultados = list(col.find(filtro, proyeccion).limit(limite))
        mongo_client.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error MongoDB: {e!s}")
    campos_excluir = {
        '_class',
        '_id',
        'politica_id',
        'cliente_id',
        'creado_por_usuario_id',
        'nodo_decision_pendiente_id',
    }
    for r in resultados:
        for campo in campos_excluir:
            r.pop(campo, None)
    for r in resultados:
        for k, v in r.items():
            if hasattr(v, 'isoformat'):
                r[k] = v.isoformat()
    columnas = list(resultados[0].keys()) if resultados else []
    return ConsultaReporteResponse(
        descripcion=descripcion,
        columnas=columnas,
        filas=resultados,
        total=len(resultados),
        tipo_grafico=data.get("tipo_grafico"),
        campo_grafico=data.get("campo_grafico"),
    )


class ComparacionPeriodosBody(BaseModel):
    texto: str = Field(..., min_length=3)


class PeriodoResult(BaseModel):
    label: str
    columnas: list[str]
    filas: list[dict[str, Any]]
    total: int


class ComparacionPeriodosResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    descripcion: str
    periodo1: PeriodoResult
    periodo2: PeriodoResult
    campo_comparacion: str = Field(serialization_alias="campoComparacion")


SYSTEM_PROMPT_COMPARACION = """Eres un experto en MongoDB que detecta comparaciones de períodos 
en lenguaje natural y genera DOS consultas MongoDB.

Las colecciones disponibles son:
- tramites: campos: politica_nombre, cliente_nombre, estado, creado_en, actividad_actual
- tareas: campos: actividad_etiqueta, departamento_texto, estado, creado_en, completado_en

El usuario pedirá algo como "compara abril vs mayo" o "diferencia entre Q1 y Q2".

FORMATO DE RESPUESTA (solo JSON, sin texto adicional):
{
  "descripcion": "descripción de la comparación",
  "coleccion": "tramites" o "tareas",
  "campo_comparacion": "estado" o "politica_nombre" o el campo más relevante para comparar,
  "label1": "Abril 2026",
  "filtro1": { "creado_en": { "$gte": "2026-04-01T00:00:00", "$lt": "2026-05-01T00:00:00" } },
  "label2": "Mayo 2026",
  "filtro2": { "creado_en": { "$gte": "2026-05-01T00:00:00", "$lt": "2026-06-01T00:00:00" } }
}

Para fechas usa strings ISO. Responde SOLO con el JSON."""


@router.post("/api/ia/comparar-periodos", response_model=ComparacionPeriodosResponse)
def comparar_periodos(body: ComparacionPeriodosBody):
    client_openai = _client()
    try:
        completion = client_openai.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_COMPARACION},
                {"role": "user", "content": body.texto.strip()},
            ],
            temperature=0.1,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error OpenAI: {e!s}") from e
    choice = completion.choices[0].message.content
    if not choice:
        raise HTTPException(status_code=502, detail="Respuesta vacía del modelo")
    data = _extraer_json(choice)
    coleccion = data.get("coleccion", "tramites")
    campo_comparacion = data.get("campo_comparacion", "estado")
    proyeccion = {"_id": 0}
    campos_excluir = {'_class', '_id', 'politica_id', 'cliente_id', 'creado_por_usuario_id', 'nodo_decision_pendiente_id'}

    def ejecutar_consulta(filtro: dict, label: str) -> PeriodoResult:
        try:
            from datetime import datetime
            filtro_procesado = {}
            for k, v in filtro.items():
                if isinstance(v, dict):
                    filtro_procesado[k] = {
                        op: datetime.fromisoformat(val) if isinstance(val, str) and 'T' in val else val
                        for op, val in v.items()
                    }
                else:
                    filtro_procesado[k] = v
            mongo_client = MongoClient(MONGO_URL)
            db = mongo_client[MONGO_DB]
            col = db[coleccion]
            resultados = list(col.find(filtro_procesado, proyeccion).limit(100))
            mongo_client.close()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error MongoDB {label}: {e!s}")
        for r in resultados:
            for campo in campos_excluir:
                r.pop(campo, None)
        for r in resultados:
            for k, v in r.items():
                if hasattr(v, 'isoformat'):
                    r[k] = v.isoformat()
        columnas = list(resultados[0].keys()) if resultados else []
        return PeriodoResult(label=label, columnas=columnas, filas=resultados, total=len(resultados))

    periodo1 = ejecutar_consulta(data.get("filtro1", {}), data.get("label1", "Período 1"))
    periodo2 = ejecutar_consulta(data.get("filtro2", {}), data.get("label2", "Período 2"))

    return ComparacionPeriodosResponse(
        descripcion=data.get("descripcion", "Comparación de períodos"),
        periodo1=periodo1,
        periodo2=periodo2,
        campo_comparacion=campo_comparacion,
    )
