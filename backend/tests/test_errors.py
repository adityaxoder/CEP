"""Request ID and public error contract tests."""

import logging

from fastapi import Query
from fastapi.testclient import TestClient


def test_not_found_uses_the_standard_error_contract(client: TestClient) -> None:
    response = client.get("/not-a-route")
    body = response.json()

    assert response.status_code == 404
    assert body["code"] == "NOT_FOUND"
    assert set(body) == {"requestId", "message", "code", "details"}
    assert body["requestId"] == response.headers["x-request-id"]
    assert body["details"] is None


def test_validation_error_omits_submitted_value(client: TestClient) -> None:
    @client.app.get("/needs-integer")
    def needs_integer(value: int = Query()):
        return {"value": value}

    response = client.get("/needs-integer?value=private-submitted-value")
    body = response.json()

    assert response.status_code == 422
    assert body["code"] == "INVALID_INPUT"
    assert body["requestId"] == response.headers["x-request-id"]
    assert body["details"]["errors"][0]["field"] == "query.value"
    assert "private-submitted-value" not in response.text


def test_unexpected_error_hides_exception_and_logs_no_exception_text(
    client: TestClient, caplog
) -> None:
    @client.app.get("/unexpected")
    def unexpected():
        raise RuntimeError("private-submitted-value")

    with caplog.at_level(logging.ERROR, logger="app.infrastructure.errors"):
        response = client.get("/unexpected")

    assert response.status_code == 500
    assert response.json()["code"] == "INTERNAL_ERROR"
    assert response.json()["requestId"] == response.headers["x-request-id"]
    assert "private-submitted-value" not in response.text
    assert "private-submitted-value" not in caplog.text
