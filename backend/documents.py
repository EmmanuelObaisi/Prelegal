"""The documents Prelegal can draft, loaded from documents.json and catalog.json at the repo root."""

import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
NDA_ID = "mutual-nda"

DOCUMENTS: list[dict] = json.loads((ROOT / "documents.json").read_text(encoding="utf-8"))
DESCRIPTIONS = {
    entry["filename"]: entry["description"]
    for entry in json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
}
DOCUMENT_IDS = tuple(document["id"] for document in DOCUMENTS)


def catalog_text() -> str:
    """One line per document: id, name and what it is for."""
    return "\n".join(f"- {d['id']}: {d['name']}. {DESCRIPTIONS[d['file']]}" for d in DOCUMENTS)


def fields_text() -> str:
    """The party roles and fields of every document other than the Mutual NDA."""
    sections = []
    for document in DOCUMENTS:
        if document["id"] == NDA_ID:
            continue
        roles = " and ".join(document["parties"])
        lines = [f"{document['id']} (parties: {roles}):"]
        lines += [f'  - key "{f["key"]}": {f["label"]} ({f["hint"]})' for f in document["fields"]]
        sections.append("\n".join(lines))
    return "\n".join(sections)
