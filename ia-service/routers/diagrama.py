import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.json_utils import _extraer_json
from core.openai_client import MODEL, _client

router = APIRouter()

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


class GenerarDiagramaBody(BaseModel):
    instruccion: str = Field(..., min_length=1)


class EditarDiagramaBody(BaseModel):
    instruccion: str = Field(..., min_length=1)
    nodosActuales: list[dict[str, Any]] = Field(default_factory=list)
    aristasActuales: list[dict[str, Any]] = Field(default_factory=list)


class DiagramaResponse(BaseModel):
    nodos: list[dict[str, Any]]
    aristas: list[dict[str, Any]]


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


@router.post("/api/ia/generar-diagrama", response_model=DiagramaResponse)
def generar_diagrama(body: GenerarDiagramaBody):
    user_msg = f"Instrucción: {body.instruccion.strip()}"
    return _llamada_openai(SYSTEM_PROMPT, user_msg)


@router.post("/api/ia/editar-diagrama", response_model=DiagramaResponse)
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
