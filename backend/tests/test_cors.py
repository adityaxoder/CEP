"""Development CORS policy tests."""

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_development_cors_allows_only_the_local_vite_origin() -> None:
    client = TestClient(create_app(Settings(app_env="development")))

    allowed = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    denied = client.options(
        "/health",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert denied.headers.get("access-control-allow-origin") is None


def test_non_development_app_does_not_enable_cors() -> None:
    client = TestClient(create_app(Settings(app_env="test")))
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.headers.get("access-control-allow-origin") is None
