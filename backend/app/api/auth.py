"""Local demo sign-up and sign-in endpoints."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import create_access_token, verify_access_token, verify_password, hash_password

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer = HTTPBearer(auto_error=False)


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1)


class SignupCredentials(Credentials):
    confirm_password: str = Field(min_length=1)


def _username(value: str) -> str:
    normalized = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,63}", normalized):
        raise HTTPException(status_code=422, detail="Use a username with letters, numbers, dots, underscores, or hyphens.")
    return normalized


def _ensure_demo_user(db: Session) -> None:
    username = "vedant"
    if db.scalar(select(User).where(User.username == username)) is None:
        db.add(User(username=username, password_hash=hash_password("123")))
        db.commit()


def _token_response(username: str, settings: Settings) -> dict[str, str]:
    return {
        "access_token": create_access_token(username, settings.jwt_signing_secret),
        "token_type": "bearer",
        "username": username,
    }


def require_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Require a valid, unexpired bearer token for protected API routes."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in is required.")
    username = verify_access_token(credentials.credentials, request.app.state.settings.jwt_signing_secret)
    user = db.scalar(select(User).where(User.username == username)) if username else None
    if user is None:
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Please sign in again.")
    return user


@router.post("/signup")
def signup(payload: SignupCredentials, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    _ensure_demo_user(db)
    username = _username(payload.username)
    if not payload.password.strip():
        raise HTTPException(status_code=422, detail="Enter a password.")
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match.")
    if db.scalar(select(User).where(User.username == username)) is not None:
        raise HTTPException(status_code=409, detail="That username is already taken.")
    user = User(username=username, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    return _token_response(username, request.app.state.settings)


@router.post("/login")
def login(payload: Credentials, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    _ensure_demo_user(db)
    username = _username(payload.username)
    if not payload.password.strip():
        raise HTTPException(status_code=422, detail="Enter a password.")
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Username or password is incorrect.")
    return _token_response(username, request.app.state.settings)


@router.get("/me")
def me(
    user: User = Depends(require_user),
) -> dict[str, str]:
    return {"username": user.username}
