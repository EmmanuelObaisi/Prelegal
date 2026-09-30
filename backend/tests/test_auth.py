"""Tests for sign up, sign in, sign out and the session cookie."""

import sqlite3

from conftest import CREDENTIALS


def test_sign_up_signs_in_and_hashes_the_password(client, db_path):
    response = client.post("/api/auth/signup", json=CREDENTIALS)

    assert response.status_code == 201
    assert response.json() == {"id": 1, "email": "ada@example.com"}
    assert "httponly" in response.headers["set-cookie"].lower()
    assert client.get("/api/auth/me").json() == {"id": 1, "email": "ada@example.com"}
    with sqlite3.connect(db_path) as conn:
        stored = conn.execute("SELECT password_hash FROM users").fetchone()[0]
    conn.close()
    assert stored.startswith("$argon2")


def test_sign_up_rejects_a_taken_email_in_any_case(signed_in_client):
    response = signed_in_client.post("/api/auth/signup", json={**CREDENTIALS, "email": " ADA@example.com"})
    assert response.status_code == 409


def test_sign_up_rejects_short_passwords_and_invalid_emails(client):
    assert client.post("/api/auth/signup", json={**CREDENTIALS, "password": "short"}).status_code == 422
    assert client.post("/api/auth/signup", json={**CREDENTIALS, "email": "not-an-email"}).status_code == 422


def test_sign_in_after_signing_out(signed_in_client):
    assert signed_in_client.post("/api/auth/signout").status_code == 204
    assert signed_in_client.get("/api/auth/me").status_code == 401

    response = signed_in_client.post("/api/auth/signin", json=CREDENTIALS)

    assert response.status_code == 200
    assert signed_in_client.get("/api/auth/me").json()["email"] == "ada@example.com"


def test_sign_in_rejects_a_wrong_password_and_unknown_email(signed_in_client):
    wrong_password = {**CREDENTIALS, "password": "wrong password"}
    unknown_email = {**CREDENTIALS, "email": "bob@example.com"}

    for credentials in (wrong_password, unknown_email):
        response = signed_in_client.post("/api/auth/signin", json=credentials)
        assert response.status_code == 401
        assert response.json() == {"detail": "Incorrect email or password."}


def test_me_requires_a_valid_session(client):
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set("session", "forged")
    assert client.get("/api/auth/me").status_code == 401
