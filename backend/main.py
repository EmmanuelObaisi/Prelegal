"""FastAPI application for Prelegal: API routes plus the static frontend."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

import chat
from database import init_db

STATIC_DIR = Path(__file__).parent.parent / "frontend" / "out"

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start every run with a fresh database."""
    init_db()
    yield


app = FastAPI(title="Prelegal API", version="0.1.0", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Report that the service is up."""
    return {"status": "healthy"}


@app.post("/api/chat")
def chat_turn(request: chat.ChatRequest) -> chat.ChatReply:
    """Advance the NDA chat by one turn: the assistant's reply and the updated fields."""
    try:
        return chat.chat_turn(request)
    except Exception as error:
        logger.exception("Chat turn failed")
        raise HTTPException(status_code=502, detail="The assistant is unavailable. Please try again.") from error


if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
