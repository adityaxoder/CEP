"""Typed provider error hierarchy for model inference and adapter layers."""

from __future__ import annotations

from app.infrastructure.errors import ApiError


class ProviderError(ApiError):
    """Base exception for all model provider failures.

    Inherits from ApiError so any unhandled provider error integrates
    directly with the project-standard API error format without leaking
    tracebacks or secrets.
    """

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(
            status_code=status_code,
            code=code,
            message=message,
            details=details,
        )


class ProviderValidationError(ProviderError):
    """Raised when submitted input is invalid, empty, or violates constraints."""

    def __init__(self, message: str, details: dict[str, object] | None = None) -> None:
        super().__init__(
            status_code=400,
            code="INVALID_INPUT",
            message=message,
            details=details,
        )


class ProviderTimeoutError(ProviderError):
    """Raised when an external or local provider call times out."""

    def __init__(
        self,
        message: str = "The text analysis request timed out. Please try again.",
    ) -> None:
        super().__init__(
            status_code=504,
            code="MODEL_TIMEOUT",
            message=message,
        )


class ProviderRateLimitError(ProviderError):
    """Raised when provider rate limits are exceeded."""

    def __init__(
        self,
        message: str = "The text analysis service is currently rate limited. Please try again later.",
    ) -> None:
        super().__init__(
            status_code=429,
            code="RATE_LIMITED",
            message=message,
        )


class ProviderUnavailableError(ProviderError):
    """Raised when the model or upstream inference service is unavailable or loading."""

    def __init__(
        self,
        message: str = "The text emotion analysis service is currently unavailable. Please try again later.",
    ) -> None:
        super().__init__(
            status_code=503,
            code="MODEL_UNAVAILABLE",
            message=message,
        )


class ProviderMalformedResponseError(ProviderError):
    """Raised when the provider returns an unexpected or malformed payload."""

    def __init__(
        self,
        message: str = "The text analysis provider returned an unrecognized response format.",
    ) -> None:
        super().__init__(
            status_code=502,
            code="MALFORMED_RESPONSE",
            message=message,
        )
