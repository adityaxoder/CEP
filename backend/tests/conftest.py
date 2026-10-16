"""Shared fixtures for backend foundation tests."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def app() -> FastAPI:
    """Create an isolated test application with no local CORS middleware."""
    return create_app(Settings(app_env="test", app_version="test-version"))


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """Return a synchronous client for API foundation tests."""
    return TestClient(app, raise_server_exceptions=False)
