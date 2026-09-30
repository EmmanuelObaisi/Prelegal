"""Shared fixtures: a temporary database, a test client that uses it, and a signed-in client."""

import pytest
from fastapi.testclient import TestClient

import database
from main import app

CREDENTIALS = {"email": "ada@example.com", "password": "correct horse"}


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    """Point the database at a temporary file."""
    path = tmp_path / "test.db"
    monkeypatch.setattr(database, "DB_PATH", path)
    return path


@pytest.fixture
def client(db_path):
    """A running app backed by the temporary database."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def signed_in_client(client):
    """The client after signing up; its cookie jar carries the session."""
    assert client.post("/api/auth/signup", json=CREDENTIALS).status_code == 201
    return client
