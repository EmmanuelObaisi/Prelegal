"""AI chat that drafts a Mutual NDA by filling its cover page fields.

Field names are camelCase to match `NdaData` in frontend/lib/nda.ts exactly.
"""

from datetime import date
from typing import Literal

from litellm import completion
from pydantic import BaseModel, Field

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

# The model sometimes emits typographic no-break spaces and hyphens, which would
# break ISO dates and filenames downstream.
PLAIN_ASCII = str.maketrans({" ": " ", " ": " ", "‑": "-"})

SYSTEM_PROMPT = """You are Prelegal's drafting assistant. You help the user complete a \
Common Paper Mutual Non-Disclosure Agreement (MNDA) through a friendly, freeform conversation.

The cover page has these fields:
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
- parties: exactly two parties, each with company, name (the signer), title (the signer's \
job title) and noticeAddress (email or postal address for formal notices).

How to respond:
- Always return the complete set of fields. Start from the current values below and change \
only what the user has told you. Never invent values; leave unknown fields as they are.
- In reply, briefly confirm anything you just filled in, then ask about one or two missing \
fields. Keep replies short, plain text, no markdown.
- Anything left empty prints as a blank to fill in by hand, so the user can stop at any time.
- When every field is filled, say the agreement is ready to download as a PDF.

Current field values:
{data}"""


class Party(BaseModel):
    """One signing party."""

    name: str
    title: str
    company: str
    noticeAddress: str


class NdaData(BaseModel):
    """The Mutual NDA cover page fields."""

    purpose: str
    effectiveDate: str
    mndaTerm: Literal["expires", "untilTerminated"]
    mndaTermYears: str
    confidentialityTerm: Literal["years", "perpetual"]
    confidentialityYears: str
    governingLaw: str
    jurisdiction: str
    modifications: str
    parties: list[Party] = Field(min_length=2, max_length=2)


class Message(BaseModel):
    """One chat message."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """The conversation so far and the current field values."""

    messages: list[Message]
    data: NdaData


class ChatReply(BaseModel):
    """The assistant's reply and the updated field values."""

    reply: str
    data: NdaData


def build_messages(request: ChatRequest) -> list[dict[str, str]]:
    """Prepend the system prompt, with today's date and current fields, to the conversation."""
    prompt = SYSTEM_PROMPT.format(today=date.today().isoformat(), data=request.data.model_dump_json())
    return [{"role": "system", "content": prompt}, *(m.model_dump() for m in request.messages)]


def chat_turn(request: ChatRequest) -> ChatReply:
    """Ask the LLM for its reply and the updated NDA fields."""
    response = completion(
        model=MODEL,
        messages=build_messages(request),
        response_format=ChatReply,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    content = response.choices[0].message.content.translate(PLAIN_ASCII)
    return ChatReply.model_validate_json(content)
