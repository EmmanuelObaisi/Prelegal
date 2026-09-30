"""Each user's drafts, autosaved after every chat turn once a document has been chosen."""

import json

from pydantic import BaseModel

import chat
import documents
from database import connect


class SavedDocumentSummary(BaseModel):
    """One entry in the user's list of documents."""

    id: int
    documentId: str
    documentName: str
    companies: list[str]
    updatedAt: str


class SavedDocument(BaseModel):
    """Everything needed to reopen a draft: its fields and the conversation so far."""

    id: int
    draft: chat.Draft
    messages: list[chat.Message]


def save(user_id: int, saved_id: int | None, draft: chat.Draft, messages: list[chat.Message]) -> int:
    """Update the user's saved draft `saved_id`, or create one if there is none; return its id."""
    values = (draft.documentId, draft.model_dump_json(), json.dumps([m.model_dump() for m in messages]))
    with connect() as conn:
        if saved_id is not None:
            cursor = conn.execute(
                "UPDATE saved_documents SET document_id = ?, draft = ?, messages = ?, "
                "updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
                (*values, saved_id, user_id),
            )
            if cursor.rowcount:
                return saved_id
        cursor = conn.execute(
            "INSERT INTO saved_documents (user_id, document_id, draft, messages) VALUES (?, ?, ?, ?)",
            (user_id, *values),
        )
        return cursor.lastrowid


def list_for(user_id: int) -> list[SavedDocumentSummary]:
    """The user's saved drafts, most recently updated first."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, document_id, draft, updated_at FROM saved_documents "
            "WHERE user_id = ? ORDER BY updated_at DESC, id DESC",
            (user_id,),
        ).fetchall()
    return [summarize(row) for row in rows]


def summarize(row) -> SavedDocumentSummary:
    """A list entry: the document's name and the companies named so far."""
    parties = json.loads(row["draft"])["parties"]
    return SavedDocumentSummary(
        id=row["id"],
        documentId=row["document_id"],
        documentName=documents.NAMES[row["document_id"]],
        companies=[p["company"] for p in parties if p["company"]],
        updatedAt=row["updated_at"],
    )


def get(user_id: int, saved_id: int) -> SavedDocument | None:
    """One of the user's saved drafts, or None if it doesn't exist or isn't theirs."""
    with connect() as conn:
        row = conn.execute(
            "SELECT id, draft, messages FROM saved_documents WHERE id = ? AND user_id = ?",
            (saved_id, user_id),
        ).fetchone()
    if row is None:
        return None
    return SavedDocument(id=row["id"], draft=json.loads(row["draft"]), messages=json.loads(row["messages"]))
