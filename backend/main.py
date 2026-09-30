"""FastAPI application for Prelegal: API routes plus the static frontend."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles

import auth
import chat
import saved_documents
from database import init_db

STATIC_DIR = Path(__file__).parent.parent / "frontend" / "out"

logger = logging.getLogger(__name__)

CurrentUser = Annotated[auth.User, Depends(auth.require_user)]


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


@app.post("/api/auth/signup", status_code=201)
def sign_up(credentials: auth.Credentials, response: Response) -> auth.User:
    """Create an account and sign in to it."""
    try:
        user = auth.create_user(credentials)
    except auth.EmailTaken as error:
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from error
    auth.start_session(user, response)
    return user


@app.post("/api/auth/signin")
def sign_in(credentials: auth.Credentials, response: Response) -> auth.User:
    """Sign in to an existing account."""
    user = auth.authenticate(credentials)
    if user is None:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    auth.start_session(user, response)
    return user


@app.post("/api/auth/signout", status_code=204)
def sign_out(response: Response, session: Annotated[str | None, Cookie()] = None) -> None:
    """End the current session."""
    auth.end_session(session, response)


@app.get("/api/auth/me")
def me(user: CurrentUser) -> auth.User:
    """The signed-in user; 401 when signed out."""
    return user


@app.post("/api/chat")
def chat_turn(request: chat.ChatRequest, user: CurrentUser) -> chat.SavedChatReply:
    """Advance the drafting chat by one turn and autosave the draft once a document is chosen."""
    try:
        result = chat.chat_turn(request)
    except Exception as error:
        logger.exception("Chat turn failed")
        raise HTTPException(status_code=502, detail="The assistant is unavailable. Please try again.") from error

    saved_id = request.savedId
    if result.draft.documentId is not None:
        transcript = [*request.messages, chat.Message(role="assistant", content=result.reply)]
        saved_id = saved_documents.save(user.id, saved_id, result.draft, transcript)
    return chat.SavedChatReply(reply=result.reply, draft=result.draft, savedId=saved_id)


@app.get("/api/documents")
def list_documents(user: CurrentUser) -> list[saved_documents.SavedDocumentSummary]:
    """The signed-in user's saved drafts, most recent first."""
    return saved_documents.list_for(user.id)


@app.get("/api/documents/{saved_id}")
def get_document(saved_id: int, user: CurrentUser) -> saved_documents.SavedDocument:
    """One of the signed-in user's saved drafts."""
    document = saved_documents.get(user.id, saved_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document


if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
