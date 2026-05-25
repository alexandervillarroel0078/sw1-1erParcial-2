import os

from dotenv import load_dotenv
from fastapi import HTTPException
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = "gpt-4o-mini"


def _client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY no está configurada. Cree ia-service/.env",
        )
    return OpenAI(api_key=OPENAI_API_KEY)
