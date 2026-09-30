"""Tests for the drafting chat: prompt assembly, LLM parsing and the /api/chat route."""

from datetime import date
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

import chat

EMPTY_PARTY = {"name": "", "title": "", "company": "", "noticeAddress": ""}
NDA = {
    "purpose": "Evaluating a partnership.",
    "effectiveDate": "",
    "mndaTerm": "expires",
    "mndaTermYears": "1",
    "confidentialityTerm": "years",
    "confidentialityYears": "1",
    "governingLaw": "",
    "jurisdiction": "",
    "modifications": "",
}
DRAFT = {"documentId": None, "nda": NDA, "parties": [EMPTY_PARTY, EMPTY_PARTY], "fields": []}
MESSAGES = [
    {"role": "assistant", "content": "What would you like to draft?"},
    {"role": "user", "content": "An SLA with 99.9% uptime."},
]


def fake_completion(content: str):
    """A stand-in for litellm.completion that returns fixed content."""

    def completion(**kwargs):
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    return completion


def test_build_messages_puts_prompt_first_then_conversation():
    request = chat.ChatRequest(messages=MESSAGES, draft=DRAFT)
    messages = chat.build_messages(request)

    prompt = messages[0]["content"]
    assert messages[0]["role"] == "system"
    assert date.today().isoformat() in prompt
    assert "- csa: Cloud Service Agreement." in prompt
    assert '  - key "targetUptime": Target Uptime (e.g. 99.9%)' in prompt
    assert '"purpose":"Evaluating a partnership."' in prompt
    assert "{key, value}" in prompt
    assert messages[1:] == MESSAGES


def test_chat_turn_parses_a_generic_document_and_normalizes_typographic_characters(monkeypatch):
    draft = {**DRAFT, "documentId": "sla", "fields": [{"key": "targetUptime", "value": "99.9 %"}]}
    reply = chat.ChatReply(reply="Done.", draft=draft).model_dump_json()
    monkeypatch.setattr(chat, "completion", fake_completion(reply))

    result = chat.chat_turn(chat.ChatRequest(messages=MESSAGES, draft=DRAFT))

    assert result.reply == "Done."
    assert result.draft.documentId == "sla"
    assert result.draft.fields == [chat.FieldValue(key="targetUptime", value="99.9 %")]


def test_chat_turn_parses_nda_fields(monkeypatch):
    draft = {**DRAFT, "documentId": "mutual-nda", "nda": {**NDA, "effectiveDate": "2026‑09‑30"}}
    monkeypatch.setattr(chat, "completion", fake_completion(chat.ChatReply(reply="Ok.", draft=draft).model_dump_json()))

    result = chat.chat_turn(chat.ChatRequest(messages=MESSAGES, draft=DRAFT))

    assert result.draft.nda.effectiveDate == "2026-09-30"


def test_draft_rejects_unknown_documents():
    with pytest.raises(ValidationError):
        chat.Draft.model_validate({**DRAFT, "documentId": "employment-agreement"})


def test_chat_reply_schema_for_the_llm_has_no_saved_id():
    assert "savedId" not in chat.ChatReply.model_json_schema()["properties"]


def test_chat_route_returns_reply_camel_case_draft_and_saved_id(signed_in_client, monkeypatch):
    updated = {**DRAFT, "documentId": "csa", "fields": [{"key": "governingLaw", "value": "Delaware"}]}
    monkeypatch.setattr(chat, "chat_turn", lambda request: chat.ChatReply(reply="Got it.", draft=updated))

    response = signed_in_client.post("/api/chat", json={"messages": MESSAGES, "draft": DRAFT})

    assert response.status_code == 200
    assert response.json() == {"reply": "Got it.", "draft": updated, "savedId": 1}


def test_chat_route_requires_sign_in(client):
    response = client.post("/api/chat", json={"messages": MESSAGES, "draft": DRAFT})
    assert response.status_code == 401


def test_chat_route_rejects_malformed_request(signed_in_client):
    body = {"messages": [{"role": "system", "content": "x"}], "draft": DRAFT}
    assert signed_in_client.post("/api/chat", json=body).status_code == 422


def test_chat_route_reports_llm_failure_as_bad_gateway(signed_in_client, monkeypatch):
    monkeypatch.setattr(chat, "completion", fake_completion("not json"))

    response = signed_in_client.post("/api/chat", json={"messages": MESSAGES, "draft": DRAFT})

    assert response.status_code == 502
    assert response.json() == {"detail": "The assistant is unavailable. Please try again."}
