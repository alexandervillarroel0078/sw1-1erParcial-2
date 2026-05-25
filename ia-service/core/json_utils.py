import json
import re
from typing import Any

from fastapi import HTTPException


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
