"""Tests for the backend foundation: health check and fresh database."""

import sqlite3

import database


def user_count(path) -> int:
    with sqlite3.connect(path) as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    return count


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_startup_creates_users_table(client, db_path):
    assert user_count(db_path) == 0


def test_init_db_discards_previous_data(db_path):
    database.init_db()
    with sqlite3.connect(db_path) as conn:
        conn.execute("INSERT INTO users (email, password_hash) VALUES ('a@example.com', 'x')")
    conn.close()
    assert user_count(db_path) == 1

    database.init_db()
    assert user_count(db_path) == 0
