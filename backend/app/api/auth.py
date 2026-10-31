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
    email: str = Field(min_length=1, max_length=320)
    password: str = Field(min_length=1)


class SignupCredentials(Credentials):
    confirm_password: str = Field(min_length=1)


def _email(value: str) -> str:
    normalized = value.strip().lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    return normalized


def _ensure_demo_user(db: Session) -> None:
    email = "vedant@gmail.com"
    if db.scalar(select(User).where(User.email == email)) is None:
        db.add(User(email=email, password_hash=hash_password("123")))
        db.commit()


def _token_response(email: str, settings: Settings) -> dict[str, str]:
    return {
        "access_token": create_access_token(email, settings.jwt_signing_secret),
        "token_type": "bearer",
        "email": email,
    }


def require_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Require a valid, unexpired bearer token for protected API routes."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in is required.")
    email = verify_access_token(credentials.credentials, request.app.state.settings.jwt_signing_secret)
    user = db.scalar(select(User).where(User.email == email)) if email else None
    if user is None:
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Please sign in again.")
    return user


@router.post("/signup")
def signup(payload: SignupCredentials, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    _ensure_demo_user(db)
    email = _email(payload.email)
    if not payload.password.strip():
        raise HTTPException(status_code=422, detail="Enter a password.")
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match.")
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    return _token_response(email, request.app.state.settings)


@router.post("/login")
def login(payload: Credentials, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    _ensure_demo_user(db)
    email = _email(payload.email)
    if not payload.password.strip():
        raise HTTPException(status_code=422, detail="Enter a password.")
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return _token_response(email, request.app.state.settings)


@router.get("/me")
def me(
    user: User = Depends(require_user),
) -> dict[str, str]:
    return {"email": user.email}
