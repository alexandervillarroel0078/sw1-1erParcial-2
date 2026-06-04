import base64
import io
from typing import Any

import pdfplumber
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel

from core.json_utils import _extraer_json
from core.openai_client import _client

router = APIRouter()

MODEL_VISION = "gpt-4o"
IMAGE_EXTENSIONS = frozenset({"jpg", "jpeg", "png", "heic", "webp"})
PDF_EXTENSION = "pdf"
MAX_PDF_PAGES_TEXT = 2
MIN_TEXT_CHARS = 40


class ValidarDocumentoResponse(BaseModel):
    valido: bool
    confianza: int
    mensaje: str


def _extension(filename: str) -> str:
    name = (filename or "").lower().strip()
    if "." not in name:
        return ""
    return name.rsplit(".", 1)[-1]


def _mime_imagen(ext: str) -> str:
    if ext in ("jpg", "jpeg"):
        return "image/jpeg"
    if ext == "png":
        return "image/png"
    if ext == "webp":
        return "image/webp"
    if ext == "heic":
        return "image/heic"
    return "image/jpeg"


def _preparar_imagen_bytes(data: bytes, ext: str) -> tuple[bytes, str]:
    """Normaliza HEIC/otros a JPEG para Vision API si hace falta."""
    if ext not in ("heic", "heif"):
        return data, _mime_imagen(ext)
    try:
        img = Image.open(io.BytesIO(data))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85)
        return out.getvalue(), "image/jpeg"
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo procesar la imagen HEIC: {e!s}",
        ) from e


def _validar_json_ia(data: dict[str, Any]) -> ValidarDocumentoResponse:
    valido = bool(data.get("valido", False))
    confianza_raw = data.get("confianza", 0)
    try:
        confianza = int(confianza_raw)
    except (TypeError, ValueError):
        confianza = 0
    confianza = max(0, min(100, confianza))
    mensaje = str(data.get("mensaje", "")).strip() or "Sin mensaje del modelo."
    return ValidarDocumentoResponse(valido=valido, confianza=confianza, mensaje=mensaje)


def _llamar_openai_json(
    messages: list[dict[str, Any]],
) -> ValidarDocumentoResponse:
    client = _client()
    try:
        completion = client.chat.completions.create(
            model=MODEL_VISION,
            messages=messages,
            temperature=0.1,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error OpenAI: {e!s}") from e
    choice = completion.choices[0].message.content
    if not choice:
        raise HTTPException(status_code=502, detail="Respuesta vacía del modelo")
    data = _extraer_json(choice)
    return _validar_json_ia(data)


def _validar_imagen(data: bytes, ext: str, nombre_requisito: str) -> ValidarDocumentoResponse:
    img_bytes, mime = _preparar_imagen_bytes(data, ext)
    b64 = base64.standard_b64encode(img_bytes).decode("ascii")
    prompt = (
        f"¿Esta imagen corresponde a un documento de tipo '{nombre_requisito}'? "
        "Responde SOLO con JSON: "
        "{valido: true/false, confianza: 0-100, mensaje: 'explicación breve en español'}"
    )
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"},
                },
            ],
        }
    ]
    return _llamar_openai_json(messages)


def _extraer_texto_pdf(data: bytes) -> str:
    partes: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages[:MAX_PDF_PAGES_TEXT]:
                texto = page.extract_text() or ""
                if texto.strip():
                    partes.append(texto.strip())
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo leer el PDF: {e!s}",
        ) from e
    return "\n\n".join(partes).strip()


def _pdf_primera_pagina_imagen(data: bytes) -> tuple[bytes, str]:
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            if not pdf.pages:
                raise HTTPException(status_code=400, detail="El PDF no tiene páginas")
            page = pdf.pages[0]
            page_image = page.to_image(resolution=150)
            pil_img = page_image.original
            if pil_img.mode in ("RGBA", "P"):
                pil_img = pil_img.convert("RGB")
            out = io.BytesIO()
            pil_img.save(out, format="PNG")
            return out.getvalue(), "image/png"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo convertir el PDF a imagen: {e!s}",
        ) from e


def _validar_pdf_texto(texto: str, nombre_requisito: str) -> ValidarDocumentoResponse:
    prompt = (
        f"El siguiente texto fue extraído de un documento. "
        f"¿Corresponde a un '{nombre_requisito}'?\n"
        f"Texto: {texto}\n"
        "Responde SOLO con JSON: "
        "{valido: true/false, confianza: 0-100, mensaje: 'explicación breve en español'}"
    )
    messages = [{"role": "user", "content": prompt}]
    return _llamar_openai_json(messages)


def _validar_pdf(data: bytes, nombre_requisito: str) -> ValidarDocumentoResponse:
    texto = _extraer_texto_pdf(data)
    if len(texto) >= MIN_TEXT_CHARS:
        return _validar_pdf_texto(texto, nombre_requisito)
    img_bytes, mime = _pdf_primera_pagina_imagen(data)
    b64 = base64.standard_b64encode(img_bytes).decode("ascii")
    prompt = (
        f"Esta imagen es la primera página de un PDF escaneado. "
        f"¿Corresponde a un documento de tipo '{nombre_requisito}'? "
        "Responde SOLO con JSON: "
        "{valido: true/false, confianza: 0-100, mensaje: 'explicación breve en español'}"
    )
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"},
                },
            ],
        }
    ]
    return _llamar_openai_json(messages)


@router.post("/api/ia/validar-documento", response_model=ValidarDocumentoResponse)
async def validar_documento(
    archivo: UploadFile = File(...),
    nombre_requisito: str = Form(...),
):
    nombre = (nombre_requisito or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="nombre_requisito es obligatorio")

    filename = archivo.filename or "archivo"
    ext = _extension(filename)
    if ext not in IMAGE_EXTENSIONS and ext != PDF_EXTENSION:
        raise HTTPException(
            status_code=400,
            detail="Solo se validan imágenes (jpg, jpeg, png, heic, webp) o PDF",
        )

    data = await archivo.read()
    if not data:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    if ext in IMAGE_EXTENSIONS:
        return _validar_imagen(data, ext, nombre)
    return _validar_pdf(data, nombre)
