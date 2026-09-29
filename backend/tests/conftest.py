"""Shared fixtures: a temporary database and a test client that uses it."""

import pytest
from fastapi.testclient import TestClient

import database
from main import app


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
