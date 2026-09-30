"""Tests for autosaving drafts after chat turns and listing and reopening them."""

import chat
from conftest import CREDENTIALS
from test_chat import DRAFT, MESSAGES

PARTIES = [
    {"name": "Ada", "title": "CEO", "company": "Acme", "noticeAddress": ""},
    {"name": "", "title": "", "company": "", "noticeAddress": ""},
]


def reply_with(monkeypatch, draft: dict, reply: str = "Noted."):
    """Make every chat turn return this draft."""
    monkeypatch.setattr(chat, "chat_turn", lambda request: chat.ChatReply(reply=reply, draft=draft))


def send(client, saved_id=None):
    return client.post("/api/chat", json={"messages": MESSAGES, "draft": DRAFT, "savedId": saved_id}).json()


def test_nothing_is_saved_before_a_document_is_chosen(signed_in_client, monkeypatch):
    reply_with(monkeypatch, DRAFT)

    assert send(signed_in_client)["savedId"] is None
    assert signed_in_client.get("/api/documents").json() == []


def test_turns_with_the_saved_id_update_one_document(signed_in_client, monkeypatch):
    reply_with(monkeypatch, {**DRAFT, "documentId": "sla"})
    saved_id = send(signed_in_client)["savedId"]

    reply_with(monkeypatch, {**DRAFT, "documentId": "csa", "parties": PARTIES}, reply="Updated.")
    assert send(signed_in_client, saved_id)["savedId"] == saved_id

    [summary] = signed_in_client.get("/api/documents").json()
    assert summary["id"] == saved_id
    assert summary["documentId"] == "csa"
    assert summary["documentName"] == "Cloud Service Agreement"
    assert summary["companies"] == ["Acme"]


def test_reopening_restores_the_draft_and_conversation(signed_in_client, monkeypatch):
    draft = {**DRAFT, "documentId": "sla", "parties": PARTIES}
    reply_with(monkeypatch, draft, reply="Which uptime?")
    saved_id = send(signed_in_client)["savedId"]

    document = signed_in_client.get(f"/api/documents/{saved_id}").json()

    assert document == {
        "id": saved_id,
        "draft": draft,
        "messages": [*MESSAGES, {"role": "assistant", "content": "Which uptime?"}],
    }


def test_new_conversations_are_listed_most_recent_first(signed_in_client, monkeypatch):
    reply_with(monkeypatch, {**DRAFT, "documentId": "sla"})
    first = send(signed_in_client)["savedId"]
    second = send(signed_in_client)["savedId"]

    assert [d["id"] for d in signed_in_client.get("/api/documents").json()] == [second, first]


def test_other_users_documents_are_hidden(signed_in_client, monkeypatch):
    reply_with(monkeypatch, {**DRAFT, "documentId": "sla"})
    saved_id = send(signed_in_client)["savedId"]

    signed_in_client.post("/api/auth/signout")
    signed_in_client.post("/api/auth/signup", json={**CREDENTIALS, "email": "bob@example.com"})

    assert signed_in_client.get("/api/documents").json() == []
    assert signed_in_client.get(f"/api/documents/{saved_id}").status_code == 404
    assert send(signed_in_client, saved_id)["savedId"] != saved_id


def test_documents_require_sign_in(client):
    assert client.get("/api/documents").status_code == 401
    assert client.get("/api/documents/1").status_code == 401
