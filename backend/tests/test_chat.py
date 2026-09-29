"""Tests for the NDA chat: prompt assembly, LLM parsing and the /api/chat route."""

from datetime import date
from types import SimpleNamespace

import chat

EMPTY_PARTY = {"name": "", "title": "", "company": "", "noticeAddress": ""}
DATA = {
    "purpose": "Evaluating a partnership.",
    "effectiveDate": "",
    "mndaTerm": "expires",
    "mndaTermYears": "1",
    "confidentialityTerm": "years",
    "confidentialityYears": "1",
    "governingLaw": "",
    "jurisdiction": "",
    "modifications": "",
    "parties": [EMPTY_PARTY, EMPTY_PARTY],
}
MESSAGES = [
    {"role": "assistant", "content": "What is the NDA for?"},
    {"role": "user", "content": "Delaware law please."},
]


def fake_completion(content: str):
    """A stand-in for litellm.completion that returns fixed content."""

    def completion(**kwargs):
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    return completion


def test_build_messages_puts_prompt_first_then_conversation():
    request = chat.ChatRequest(messages=MESSAGES, data=DATA)
    messages = chat.build_messages(request)

    assert messages[0]["role"] == "system"
    assert date.today().isoformat() in messages[0]["content"]
    assert '"purpose":"Evaluating a partnership."' in messages[0]["content"]
    assert messages[1:] == MESSAGES


def test_chat_turn_parses_reply_and_normalizes_typographic_characters(monkeypatch):
    data = {**DATA, "effectiveDate": "2026‑09‑30", "governingLaw": "New York"}
    reply = chat.ChatReply(reply="Done.", data=data).model_dump_json()
    monkeypatch.setattr(chat, "completion", fake_completion(reply))

    result = chat.chat_turn(chat.ChatRequest(messages=MESSAGES, data=DATA))

    assert result.reply == "Done."
    assert result.data.effectiveDate == "2026-09-30"
    assert result.data.governingLaw == "New York"


def test_chat_route_returns_reply_and_camel_case_fields(client, monkeypatch):
    updated = {**DATA, "governingLaw": "Delaware"}
    monkeypatch.setattr(chat, "chat_turn", lambda request: chat.ChatReply(reply="Got it.", data=updated))

    response = client.post("/api/chat", json={"messages": MESSAGES, "data": DATA})

    assert response.status_code == 200
    assert response.json() == {"reply": "Got it.", "data": updated}


def test_chat_route_rejects_malformed_request(client):
    response = client.post("/api/chat", json={"messages": [{"role": "system", "content": "x"}], "data": DATA})
    assert response.status_code == 422


def test_chat_route_reports_llm_failure_as_bad_gateway(client, monkeypatch):
    monkeypatch.setattr(chat, "completion", fake_completion("not json"))

    response = client.post("/api/chat", json={"messages": MESSAGES, "data": DATA})

    assert response.status_code == 502
    assert response.json() == {"detail": "The assistant is unavailable. Please try again."}
