import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.json_utils import _extraer_json
from core.openai_client import MODEL, _client

router = APIRouter()

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


@router.post("/api/ia/sugerir-politica", response_model=SugerirPoliticaResponse)
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
