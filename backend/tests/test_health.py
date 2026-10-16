"""Health endpoint tests."""

from fastapi.testclient import TestClient


def test_health_reports_api_and_model_readiness(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "version": "test-version",
        "models": {
            "text": "unavailable",
            "image": "unavailable",
            "audio": "unavailable",
            "coach": "unavailable",
        },
    }
    assert response.headers["x-request-id"]
