"""Integration and validation tests for POST /coach."""

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def test_app():
    return create_app(Settings(app_env="test", app_version="test-version", allow_dev_baseline=True))


@pytest.fixture
def client(test_app):
    return TestClient(test_app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------

def test_coach_empty_text_rejected(client: TestClient):
    """Empty or whitespace text is rejected with 422 INVALID_INPUT."""
    response = client.post("/coach", json={"text": "   ", "style": "light"})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "INVALID_INPUT"
    assert "enter a sentence" in body["message"].lower()


def test_coach_invalid_style_rejected(client: TestClient):
    """Unsupported style rejected with 422."""
    response = client.post("/coach", json={"text": "Hello there.", "style": "aggressive"})
    assert response.status_code == 422


def test_coach_missing_style_rejected(client: TestClient):
    """Missing style field rejected with 422."""
    response = client.post("/coach", json={"text": "Hello there."})
    assert response.status_code == 422


def test_coach_text_too_long_rejected(client: TestClient):
    """Text exceeding 10,000 characters is rejected with 422."""
    long_text = "word " * 2500
    response = client.post("/coach", json={"text": long_text, "style": "light"})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Style reframing tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "style,expected_keyword",
    [
        ("light", "quick note"),
        ("strict", "promptly"),
        ("happy", "happy to help"),
        ("sad", "discouraged"),
        ("formal", "please be advised"),
        ("informal", "can we"),
    ],
)
def test_coach_supported_styles(client: TestClient, style: str, expected_keyword: str):
    """Each supported style reframes the input while preserving intent."""
    text = "Please submit the quarterly report."
    response = client.post("/coach", json={"text": text, "style": style})
    assert response.status_code == 200
    body = response.json()

    assert "requestId" in body
    assert body["originalText"] == text
    assert body["style"] == style
    assert expected_keyword in body["reframedText"].lower()
    assert style in body["explanation"].lower()
