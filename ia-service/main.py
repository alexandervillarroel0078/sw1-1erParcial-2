"""
Microservicio FastAPI: generación y edición de diagramas de flujo vía OpenAI.
"""

import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")
MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """Eres un experto en diseño de workflows de políticas
de negocio institucionales.

TIPOS DE NODO:
- START: inicio del flujo (solo uno por política)
- END: fin del flujo (solo uno por política)
- ACTIVIDAD: tarea humana que realiza un departamento
  tiene etiqueta, departamento y slaMinutos (tiempo límite)
- DECISION: punto de bifurcación con condición
  sus aristas salientes tienen etiqueta 'Sí' o 'No'
  SOLO puede tener 2 aristas salientes
- FORK_BAR: inicio de actividades paralelas
  múltiples aristas salientes simultáneas
- JOIN_BAR: sincronización de paralelos
  espera que TODAS las ramas anteriores terminen

TIPOS DE FLUJO:
- Secuencial: A → B → C
- Alternativo: A → DECISION → Sí: B / No: C
- Paralelo: A → FORK → [B y C simultáneos] → JOIN → D
- Iterativo: A → DECISION → No: vuelve a A / Sí: continúa

DEPARTAMENTOS (calles/swimlanes):
Cada nodo ACTIVIDAD pertenece a un departamento.
El departamento determina qué funcionario atiende la actividad.
Ejemplos: 'Atención al Cliente', 'Validación Técnica',
'Jurídico', 'Dirección', 'Soporte Técnico'

SLA (tiempo límite):
Cada nodo ACTIVIDAD puede tener slaMinutos.
Ejemplo: slaMinutos: 30 significa 30 minutos para completar.
Si no se especifica, dejar en null.

FORMATO DE RESPUESTA (JSON exacto):
{
  "nodos": [
    {
      "id": "n1",
      "tipo": "START|END|ACTIVIDAD|DECISION|FORK_BAR|JOIN_BAR",
      "etiqueta": "nombre descriptivo",
      "posicionX": número (100-1200),
      "posicionY": número (100-600),
      "departamento": "nombre del departamento o null",
      "slaMinutos": número o null
    }
  ],
  "aristas": [
    {
      "id": "a1",
      "desdeNodoId": "id origen",
      "haciaNodoId": "id destino",
      "etiqueta": "Sí" | "No" | null
    }
  ]
}

REGLAS IMPORTANTES:
- Siempre START al inicio y END al final
- REGLA CRÍTICA DE NODOS END:
  - NUNCA conectar dos aristas diferentes al mismo nodo END
  - Cada rama que termina el flujo DEBE tener su PROPIO
    nodo END con ID único
  - Ejemplo CORRECTO:
    Sí → n_end1 (END)
    No → n_end2 (END)
  - Ejemplo INCORRECTO:
    Sí → n_end1 (END)
    No → n_end1 (END) ← PROHIBIDO, mismo ID
- DECISION solo tiene aristas Sí y No — nada más
- FORK_BAR siempre seguido de JOIN_BAR
- Posiciones X de izquierda a derecha (flujo horizontal)
- Actividades paralelas en diferentes posiciones Y
- IDs de nodos: n1, n2, n3...
- IDs de aristas: a1, a2, a3...
- Responder SOLO con el JSON, sin texto adicional

MODO EDICIÓN (cuando el mensaje del usuario incluye "Diagrama actual:"):
- Devuelve el diagrama COMPLETO modificado según la instrucción
- Mantener IDs existentes de nodos y aristas salvo eliminaciones
- Los nuevos nodos usan IDs que continúan la secuencia (nN, aN)
- Mantener posiciones existentes; nuevos nodos cerca del lugar lógico
- "agrega X después de Y": insertar entre Y y su siguiente
- "conecta A con B": agregar arista entre esos nodos
- "elimina X": quitar ese nodo y todas sus aristas incidentes
- REGLA END MÚLTIPLES en modo edición:
  Si el diagrama ya tiene un nodo END y la instrucción
  agrega una nueva rama que también termina, crear un
  NUEVO nodo END con ID diferente (ejemplo: si existe
  'n_end', crear 'n_end2'). NUNCA usar el mismo END
  para dos ramas diferentes.
- REGLA NODOS HUÉRFANOS:
  En modo edición, TODOS los nodos del diagrama actual
  deben estar conectados en el diagrama resultado.
  Ningún nodo puede quedar sin aristas de entrada
  (excepto START) ni sin aristas de salida (excepto END).
  Si un nodo queda desconectado, reconéctalo al lugar
  lógico más cercano en el flujo."""


SYSTEM_PROMPT_FORMULARIO = """Eres un asistente que ayuda a completar formularios
de reporte institucional a partir de lo que dictó el funcionario.

Entrada que recibirás en el mensaje del usuario:
1) Texto transcrito desde voz del funcionario (puede ser imperfecto).
2) Lista JSON de campos del formulario. Cada campo tiene:
   - id: identificador técnico que debes repetir igual en la salida
   - etiqueta: nombre visible del campo (sirve para interpretar la intención)
   - tipo: texto_corto | texto_largo | select | fecha | checkbox |
           imagen | archivo

Tu tarea:
- Analizar el texto dictado y extraer la información útil para cada campo.
- Mapear cada dato al campo cuya etiqueta y tipo encajen mejor con ese dato.
- Para checkbox: interpreta como verdadero símbolos como "sí", "correcto",
  "confirmo", "de acuerdo"; como falso "no", "incorrecto".
- Para fecha: responder en formato ISO yyyy-mm-dd cuando sea posible; si solo hay
  día/mes mencionados en el año actual, inferir fecha razonable.
- Para select: usa exactamente uno de los valores esperados si el texto lo permite;
  si no hay opciones en el campo, usa el texto corto más probable.
- Si para un campo no hay información suficiente en la transcripción,
  pon valor vacío "" para ese campo (checkbox: "" se interpretará como false en el cliente).
- imagen/archivo deja valor "" salvo que el texto implique texto descriptivo (opcional).

FORMATO DE RESPUESTA (solo esto, sin texto adicional ni markdown salvo fences opcionales):
Un único objeto JSON:
{
  "valores": [
    { "id": "<mismo id del campo>", "valor": "<string>" }
  ]

Debes incluir una entrada por cada campo recibido en la lista (mismo orden no es obligatorio).
Responde SOLO con el JSON."""


class GenerarDiagramaBody(BaseModel):
    instruccion: str = Field(..., min_length=1)


class EditarDiagramaBody(BaseModel):
    instruccion: str = Field(..., min_length=1)
    nodosActuales: list[dict[str, Any]] = Field(default_factory=list)
    aristasActuales: list[dict[str, Any]] = Field(default_factory=list)


class DiagramaResponse(BaseModel):
    nodos: list[dict[str, Any]]
    aristas: list[dict[str, Any]]


class CampoFormularioItem(BaseModel):
    id: str
    etiqueta: str
    tipo: str


class RellenarFormularioBody(BaseModel):
    textoVoz: str = Field(..., min_length=1)
    campos: list[CampoFormularioItem] = Field(default_factory=list)


class ValorCampoSalida(BaseModel):
    id: str
    valor: str = ""


class RellenarFormularioResponse(BaseModel):
    valores: list[ValorCampoSalida]


def _client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY no está configurada. Cree ia-service/.env",
        )
    return OpenAI(api_key=OPENAI_API_KEY)


def _extraer_json(texto: str) -> dict[str, Any]:
    t = texto.strip()
    # Quitar fences ```json
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```", t, re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()

    # Buscar el primer objeto JSON completo
    # Encontrar donde empieza el { y balancear las llaves
    start = t.find("{")
    if start == -1:
        raise HTTPException(status_code=502, detail="No se encontró JSON en la respuesta")

    depth = 0
    for i, ch in enumerate(t[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    data = json.loads(t[start : i + 1])
                except json.JSONDecodeError as e:
                    raise HTTPException(status_code=502, detail=f"JSON inválido: {e}")
                if not isinstance(data, dict):
                    raise HTTPException(
                        status_code=502,
                        detail="El JSON raíz debe ser un objeto",
                    )
                return data

    raise HTTPException(status_code=502, detail="JSON incompleto en la respuesta")


def _validar_diagrama(data: dict[str, Any]) -> DiagramaResponse:
    nodos = data.get("nodos")
    aristas = data.get("aristas")
    if not isinstance(nodos, list):
        raise HTTPException(status_code=502, detail='Falta clave "nodos" (lista)')
    if not isinstance(aristas, list):
        raise HTTPException(status_code=502, detail='Falta clave "aristas" (lista)')
    return DiagramaResponse(nodos=nodos, aristas=aristas)


def _llamada_openai(system: str, user: str) -> DiagramaResponse:
    client = _client()
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error OpenAI: {e!s}") from e

    choice = completion.choices[0].message.content
    if not choice:
        raise HTTPException(status_code=502, detail="Respuesta vacía del modelo")
    print(f"RESPUESTA OPENAI RAW:\n{choice}")
    data = _extraer_json(choice)
    return _validar_diagrama(data)


def _validar_valores_formulario(data: dict[str, Any]) -> RellenarFormularioResponse:
    valores = data.get("valores")
    if not isinstance(valores, list):
        raise HTTPException(
            status_code=502,
            detail='La respuesta debe tener clave "valores" (lista)',
        )
    result: list[ValorCampoSalida] = []
    for item in valores:
        if not isinstance(item, dict):
            continue
        cid = item.get("id")
        if cid is None:
            continue
        val = item.get("valor")
        result.append(
            ValorCampoSalida(id=str(cid), valor="" if val is None else str(val)),
        )
    return RellenarFormularioResponse(valores=result)


def _llamada_openai_formulario(user: str) -> RellenarFormularioResponse:
    client = _client()
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_FORMULARIO},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error OpenAI: {e!s}") from e

    choice = completion.choices[0].message.content
    if not choice:
        raise HTTPException(status_code=502, detail="Respuesta vacía del modelo")
    data = _extraer_json(choice)
    return _validar_valores_formulario(data)


app = FastAPI(title="IA Diagramas", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "modelo": MODEL}


@app.post("/api/ia/generar-diagrama", response_model=DiagramaResponse)
def generar_diagrama(body: GenerarDiagramaBody):
    user_msg = f"Instrucción: {body.instruccion.strip()}"
    return _llamada_openai(SYSTEM_PROMPT, user_msg)


@app.post("/api/ia/editar-diagrama", response_model=DiagramaResponse)
def editar_diagrama(body: EditarDiagramaBody):
    diagrama_json = json.dumps(
        {"nodos": body.nodosActuales, "aristas": body.aristasActuales},
        ensure_ascii=False,
        indent=2,
    )
    user_msg = (
        f"Diagrama actual: {diagrama_json}\n"
        f"Instrucción: {body.instruccion.strip()}"
    )
    result = _llamada_openai(SYSTEM_PROMPT, user_msg)

    originales_por_id = {
        str(n.get("id")): n
        for n in body.nodosActuales
        if isinstance(n, dict) and n.get("id") is not None
    }
    for nodo in result.nodos:
        if not isinstance(nodo, dict):
            continue
        nid = nodo.get("id")
        if nid is None:
            continue
        original = originales_por_id.get(str(nid))
        if not original:
            continue
        for k in ("departamentoId", "departamentoTexto", "calleId"):
            if (k not in nodo or nodo.get(k) is None) and k in original:
                nodo[k] = original.get(k)

    return result


@app.post("/api/ia/rellenar-formulario", response_model=RellenarFormularioResponse)
def rellenar_formulario(body: RellenarFormularioBody):
    if not body.campos:
        return RellenarFormularioResponse(valores=[])
    campos_json = json.dumps(
        [{"id": c.id, "etiqueta": c.etiqueta, "tipo": c.tipo} for c in body.campos],
        ensure_ascii=False,
        indent=2,
    )
    user_msg = (
        f"Texto dictado por el funcionario:\n{body.textoVoz.strip()}\n\n"
        f"Campos del formulario:\n{campos_json}"
    )
    return _llamada_openai_formulario(user_msg)


SYSTEM_PROMPT_POLITICA = """Eres un asistente que analiza la situación descrita 
por un cliente y determina cuál política de negocio corresponde asignarle.

Recibirás:
1) Texto transcrito de la descripción del cliente.
2) Lista JSON de políticas disponibles con id, nombre y descripción.

Tu tarea:
- Analizar el texto y elegir la política que mejor se adapta a la situación.
- Devolver SOLO el id de la política elegida y una justificación breve.

FORMATO DE RESPUESTA (solo esto, sin texto adicional):
{
  "politicaId": "<id exacto de la política>",
  "justificacion": "<explicación breve de por qué esta política>"
}

Responde SOLO con el JSON.

Si ninguna política se adapta claramente a la situación descrita, devuelve:
{
  "politicaId": null,
  "justificacion": "No se encontró una política adecuada para esta situación"
}

Si el texto no tiene relación con trámites, solicitudes, servicios o procesos institucionales, 
devuelve politicaId: null y justificacion: 'La descripción no corresponde a ningún trámite institucional conocido. Por favor comuníquese con un funcionario.'"""


class PoliticaItem(BaseModel):
    id: str
    nombre: str
    descripcion: str = ""


class SugerirPoliticaBody(BaseModel):
    textoVoz: str = Field(..., min_length=1)
    politicas: list[PoliticaItem] = Field(default_factory=list)


class SugerirPoliticaResponse(BaseModel):
    politicaId: str | None = None
    justificacion: str


def _validar_sugerencia_politica(data: dict[str, Any]) -> SugerirPoliticaResponse:
    pid = data.get("politicaId")
    just = data.get("justificacion", "")
    politica_id = None if pid is None or pid == "" else str(pid)
    return SugerirPoliticaResponse(politicaId=politica_id, justificacion=str(just))


@app.post("/api/ia/sugerir-politica", response_model=SugerirPoliticaResponse)
def sugerir_politica(body: SugerirPoliticaBody):
    if not body.politicas:
        raise HTTPException(status_code=400, detail="No hay políticas disponibles")
    politicas_json = json.dumps(
        [{"id": p.id, "nombre": p.nombre, "descripcion": p.descripcion}
         for p in body.politicas],
        ensure_ascii=False,
        indent=2,
    )
    user_msg = (
        f"Descripción del cliente:\n{body.textoVoz.strip()}\n\n"
        f"Políticas disponibles:\n{politicas_json}"
    )
    client = _client()
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_POLITICA},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.1,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error OpenAI: {e!s}") from e
    choice = completion.choices[0].message.content
    if not choice:
        raise HTTPException(status_code=502, detail="Respuesta vacía del modelo")
    data = _extraer_json(choice)
    return _validar_sugerencia_politica(data)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)