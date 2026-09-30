"""Accounts and sessions: Argon2 password hashes and opaque session tokens in an HttpOnly cookie."""

import secrets
import sqlite3
from typing import Annotated

from fastapi import Cookie, HTTPException, Response
from pwdlib import PasswordHash
from pydantic import BaseModel, Field, field_validator

from database import connect

SESSION_COOKIE = "session"

password_hash = PasswordHash.recommended()


class Credentials(BaseModel):
    """An email and password, for signing up or signing in. Emails match case-insensitively."""

    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        """Trim and lowercase the email before validating it."""
        return email.strip().lower()


class User(BaseModel):
    """The signed-in user."""

    id: int
    email: str


class EmailTaken(Exception):
    """Raised when signing up with an email that already has an account."""


def create_user(credentials: Credentials) -> User:
    """Register a new account."""
    try:
        with connect() as conn:
            cursor = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (credentials.email, password_hash.hash(credentials.password)),
            )
    except sqlite3.IntegrityError as error:
        raise EmailTaken from error
    return User(id=cursor.lastrowid, email=credentials.email)


def authenticate(credentials: Credentials) -> User | None:
    """The account matching these credentials, or None."""
    with connect() as conn:
        row = conn.execute("SELECT id, password_hash FROM users WHERE email = ?", (credentials.email,)).fetchone()
    if row is None or not password_hash.verify(credentials.password, row["password_hash"]):
        return None
    return User(id=row["id"], email=credentials.email)


def start_session(user: User, response: Response) -> None:
    """Create a session for the user and set its cookie."""
    token = secrets.token_urlsafe(32)
    with connect() as conn:
        conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user.id))
    response.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax")


def end_session(token: str | None, response: Response) -> None:
    """Delete the session and clear its cookie."""
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    response.delete_cookie(SESSION_COOKIE, httponly=True, samesite="lax")


def require_user(session: Annotated[str | None, Cookie()] = None) -> User:
    """FastAPI dependency: the user behind the session cookie, or 401."""
    with connect() as conn:
        row = conn.execute(
            "SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id "
            "WHERE sessions.token = ?",
            (session,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return User(id=row["id"], email=row["email"])
