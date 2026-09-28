"""Tests for the backend foundation: health check and fresh database."""

import sqlite3

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


def user_count(path) -> int:
    with sqlite3.connect(path) as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    return count


def test_health(db_path):
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_startup_creates_users_table(db_path):
    with TestClient(app):
        assert user_count(db_path) == 0


def test_init_db_discards_previous_data(db_path):
    database.init_db()
    with sqlite3.connect(db_path) as conn:
        conn.execute("INSERT INTO users (email) VALUES ('a@example.com')")
    conn.close()
    assert user_count(db_path) == 1

    database.init_db()
    assert user_count(db_path) == 0
