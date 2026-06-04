import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.json_utils import _extraer_json
from core.openai_client import MODEL, _client

router = APIRouter()

SYSTEM_PROMPT_FORMULARIO = """Eres un asistente que ayuda a completar formularios
de reporte institucional a partir de lo que dictó el funcionario.

Entrada que recibirás en el mensaje del usuario:
1) Texto transcrito desde voz del funcionario (puede ser imperfecto).
2) Lista JSON de campos del formulario. Cada campo tiene:
   - id: identificador técnico que debes repetir igual en la salida
   - etiqueta: nombre visible del campo (sirve para interpretar la intención)
   - tipo: texto_corto | texto_largo | select | fecha | checkbox |
           imagen | archivo
   - opciones (solo en tipo select): array de valores permitidos

Tu tarea:
- Analizar el texto dictado y extraer la información útil para cada campo.
- Mapear cada dato al campo cuya etiqueta y tipo encajen mejor con ese dato.
- Para checkbox: interpreta como verdadero símbolos como "sí", "correcto",
  "confirmo", "de acuerdo"; como falso "no", "incorrecto".
- Para fecha: responder en formato ISO yyyy-mm-dd cuando sea posible; si solo hay
  día/mes mencionados en el año actual, inferir fecha razonable.
- Para campos select, devuelve EXACTAMENTE uno de los valores del array opciones
  (coincidencia literal, respetando mayúsculas/minúsculas). Si el dictado no encaja
  con ninguna opción, deja valor "".
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


class CampoFormularioItem(BaseModel):
    id: str
    etiqueta: str
    tipo: str
    opciones: list[str] | None = None


class RellenarFormularioBody(BaseModel):
    textoVoz: str = Field(..., min_length=1)
    campos: list[CampoFormularioItem] = Field(default_factory=list)


class ValorCampoSalida(BaseModel):
    id: str
    valor: str = ""


class RellenarFormularioResponse(BaseModel):
    valores: list[ValorCampoSalida]


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


@router.post("/api/ia/rellenar-formulario", response_model=RellenarFormularioResponse)
def rellenar_formulario(body: RellenarFormularioBody):
    if not body.campos:
        return RellenarFormularioResponse(valores=[])
    campos_payload: list[dict[str, Any]] = []
    for c in body.campos:
        item: dict[str, Any] = {
            "id": c.id,
            "etiqueta": c.etiqueta,
            "tipo": c.tipo,
        }
        if c.opciones:
            item["opciones"] = c.opciones
        campos_payload.append(item)
    campos_json = json.dumps(campos_payload, ensure_ascii=False, indent=2)
    user_msg = (
        f"Texto dictado por el funcionario:\n{body.textoVoz.strip()}\n\n"
        f"Campos del formulario:\n{campos_json}"
    )
    return _llamada_openai_formulario(user_msg)
