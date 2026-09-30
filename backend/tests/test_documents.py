"""Tests for the document definitions shared with the frontend."""

import documents

TEMPLATES = documents.ROOT / "templates"


def test_every_document_has_a_template_and_catalog_entry():
    for document in documents.DOCUMENTS:
        assert (TEMPLATES / document["file"]).is_file()
        assert document["file"] in documents.DESCRIPTIONS


def test_every_catalog_template_is_offered_except_the_nda_cover_page():
    offered = {document["file"] for document in documents.DOCUMENTS}
    assert set(documents.DESCRIPTIONS) - offered == {"Mutual-NDA-coverpage.md"}


def test_ids_slugs_and_field_keys_are_unique_and_every_document_has_two_parties():
    assert len(set(documents.DOCUMENT_IDS)) == len(documents.DOCUMENT_IDS)
    slugs = [document["slug"] for document in documents.DOCUMENTS]
    assert len(set(slugs)) == len(slugs)
    for document in documents.DOCUMENTS:
        keys = [field["key"] for field in document["fields"]]
        assert len(set(keys)) == len(keys)
        assert len(document["parties"]) == 2


def test_catalog_text_lists_every_document():
    text = documents.catalog_text()
    assert "- csa: Cloud Service Agreement." in text
    assert len(text.splitlines()) == len(documents.DOCUMENTS)


def test_fields_text_lists_generic_fields_but_not_the_nda():
    text = documents.fields_text()
    assert "sla (parties: Provider and Customer):" in text
    assert '  - key "targetUptime": Target Uptime (e.g. 99.9%)' in text
    assert documents.NDA_ID not in text
