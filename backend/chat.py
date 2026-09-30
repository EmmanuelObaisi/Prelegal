"""AI chat that picks a legal document and fills in its fields.

Field names are camelCase to match `Draft` in frontend/lib/chat.ts exactly.
"""

from datetime import date
from typing import Literal

from litellm import completion
from pydantic import BaseModel, Field

import documents

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

# The model sometimes emits typographic no-break spaces and hyphens, which would
# break ISO dates and filenames downstream.
PLAIN_ASCII = str.maketrans({" ": " ", " ": " ", "‑": "-"})

SYSTEM_PROMPT = """You are Prelegal's drafting assistant. You help the user draft one legal \
agreement, based on the Common Paper standard templates, through a friendly, freeform conversation.

Documents you can draft (id: name. description):
{catalog}

Choosing the document:
- documentId is the document being drafted, or null until the user has chosen one.
- When the user asks for one of the documents above, set documentId to its id.
- If they ask for a document that is not listed, say plainly that Prelegal can't generate it yet, \
suggest the closest document above and explain why it is the closest, and ask if they want it. \
Leave documentId unchanged until they agree.
- If it is unclear what they need, ask what they are trying to achieve and suggest a document.
- The user may switch documents at any time; set documentId to the new one.

Fields for mutual-nda go in nda:
- purpose: how each party may use the other's confidential information.
- effectiveDate: the date the agreement starts, as YYYY-MM-DD. Today is {today}.
- mndaTerm: "expires" (the agreement ends after mndaTermYears years) or "untilTerminated" \
(it continues until either party ends it).
- mndaTermYears: whole number of years as a string, used when mndaTerm is "expires".
- confidentialityTerm: "years" (confidentiality lasts confidentialityYears years) or \
"perpetual" (it lasts forever).
- confidentialityYears: whole number of years as a string, used when confidentialityTerm is "years".
- governingLaw: the US state whose laws govern the agreement, e.g. "Delaware".
- jurisdiction: where disputes are heard, e.g. "courts located in New Castle, DE".
- modifications: any changes to the standard terms; empty means none.

Parties, for every document including mutual-nda: exactly two, in the order of the document's \
party roles below (mutual-nda: Party 1 and Party 2), each with company, name (the signer), \
title (the signer's job title) and noticeAddress (email or postal address for formal notices).

Fields for every other document:
- fields: one {{key, value}} entry per field of the chosen document. Use the exact key in quotes \
below, never the label. Values are short plain text; write dates like "October 1, 2026".
{fields}

How to respond:
- Always return documentId, nda, parties and fields in full. Start from the current values below \
and change only what the user has told you. Never invent values; leave unknown ones empty.
- In reply, briefly confirm anything you just filled in, then ask about one or two missing \
fields of the chosen document. Keep replies short, plain text, no markdown.
- Anything left empty prints as a blank to fill in by hand, so the user can stop at any time.
- When every field of the chosen document is filled, say it is ready to download as a PDF.

Current values:
{draft}"""


class Party(BaseModel):
    """One signing party."""

    name: str
    title: str
    company: str
    noticeAddress: str


class NdaData(BaseModel):
    """The Mutual NDA cover page fields, apart from the parties, which every document shares."""

    purpose: str
    effectiveDate: str
    mndaTerm: Literal["expires", "untilTerminated"]
    mndaTermYears: str
    confidentialityTerm: Literal["years", "perpetual"]
    confidentialityYears: str
    governingLaw: str
    jurisdiction: str
    modifications: str


class FieldValue(BaseModel):
    """The value of one field of a generated Key Terms page."""

    key: str
    value: str


class Draft(BaseModel):
    """The chosen document and every field value collected so far."""

    documentId: Literal[documents.DOCUMENT_IDS] | None
    nda: NdaData
    parties: list[Party] = Field(min_length=2, max_length=2)
    fields: list[FieldValue]


class Message(BaseModel):
    """One chat message."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """The conversation so far, the current draft and, once saved, the draft's saved id."""

    messages: list[Message]
    draft: Draft
    savedId: int | None = None


class ChatReply(BaseModel):
    """The assistant's reply and the updated draft. Also the LLM's structured-output schema."""

    reply: str
    draft: Draft


class SavedChatReply(ChatReply):
    """The reply sent to the browser: the chat reply plus the id the draft is saved under."""

    savedId: int | None


def build_messages(request: ChatRequest) -> list[dict[str, str]]:
    """Prepend the system prompt, with the documents, today's date and the draft, to the conversation."""
    prompt = SYSTEM_PROMPT.format(
        catalog=documents.catalog_text(),
        fields=documents.fields_text(),
        today=date.today().isoformat(),
        draft=request.draft.model_dump_json(),
    )
    return [{"role": "system", "content": prompt}, *(m.model_dump() for m in request.messages)]


def chat_turn(request: ChatRequest) -> ChatReply:
    """Ask the LLM for its reply and the updated draft."""
    response = completion(
        model=MODEL,
        messages=build_messages(request),
        response_format=ChatReply,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    content = response.choices[0].message.content.translate(PLAIN_ASCII)
    return ChatReply.model_validate_json(content)
