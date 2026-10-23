"""Request correlation and safe HTTP error handling."""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.schemas import ErrorResponse

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """An expected public API error with an explicit safe code and message."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, object] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assign a backend-generated request ID to every request and response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request.state.request_id = str(uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response


def request_id_for(request: Request) -> str:
    """Read the middleware-generated ID, including during exception handling."""
    return getattr(request.state, "request_id", str(uuid4()))


def error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, object] | None = None,
) -> JSONResponse:
    """Return the project-standard error body and correlation header."""
    request_id = request_id_for(request)
    body = ErrorResponse(
        requestId=request_id,
        message=message,
        code=code,
        details=details,
    )
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(),
        headers={"X-Request-ID": request_id},
    )


def _validation_details(errors: Sequence[dict[str, Any]]) -> dict[str, object]:
    """Expose field locations/messages while excluding submitted input values."""
    safe_errors: list[dict[str, object]] = []
    for error in errors:
        location = error.get("loc", ())
        safe_errors.append(
            {
                "field": ".".join(str(part) for part in location),
                "message": str(error.get("msg", "Invalid value.")),
                "type": str(error.get("type", "validation_error")),
            }
        )
    return {"errors": safe_errors}


def register_error_handlers(application: FastAPI) -> None:
    """Register uniform public errors without exposing internal tracebacks."""

    @application.exception_handler(ApiError)
    async def handle_api_error(request: Request, error: ApiError) -> JSONResponse:
        return error_response(
            request,
            status_code=error.status_code,
            code=error.code,
            message=error.message,
            details=error.details,
        )

    @application.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        return error_response(
            request,
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="INVALID_INPUT",
            message="One or more request values are invalid.",
            details=_validation_details(error.errors()),
        )

    @application.exception_handler(StarletteHTTPException)
    async def handle_http_error(
        request: Request, error: StarletteHTTPException
    ) -> JSONResponse:
        status_messages = {
            status.HTTP_400_BAD_REQUEST: ("INVALID_INPUT", "The request could not be processed."),
            status.HTTP_401_UNAUTHORIZED: ("UNAUTHORIZED", "Authentication is required for this request."),
            status.HTTP_403_FORBIDDEN: ("FORBIDDEN", "You do not have permission to perform this action."),
            status.HTTP_404_NOT_FOUND: ("NOT_FOUND", "The requested resource was not found."),
            status.HTTP_405_METHOD_NOT_ALLOWED: ("METHOD_NOT_ALLOWED", "This HTTP method is not supported for the requested resource."),
            status.HTTP_413_CONTENT_TOO_LARGE: ("FILE_TOO_LARGE", "The submitted file exceeds the allowed size."),
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: ("UNSUPPORTED_MEDIA_TYPE", "The submitted media type is not supported."),
            status.HTTP_429_TOO_MANY_REQUESTS: ("RATE_LIMITED", "Too many requests were submitted. Please try again later."),
        }
        code, message = status_messages.get(
            error.status_code,
            ("HTTP_ERROR", "The request could not be completed."),
        )
        return error_response(
            request,
            status_code=error.status_code,
            code=code,
            message=message,
        )

    @application.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, error: Exception) -> JSONResponse:
        # Do not log exception strings or tracebacks here: provider/framework
        # exceptions can accidentally include submitted text or media details.
        logger.error(
            "Unhandled API exception request_id=%s method=%s error_type=%s",
            request_id_for(request),
            request.method,
            type(error).__name__,
        )
        return error_response(
            request,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_ERROR",
            message="An unexpected error occurred. Please try again later.",
        )
