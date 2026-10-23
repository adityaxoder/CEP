"""Text emotion provider implementations and response normalizers."""

from __future__ import annotations

import asyncio
import inspect
import logging
from typing import Any

import aiohttp
from huggingface_hub import AsyncInferenceClient, errors

from app.models.base import ModalityResult, TextEmotionProvider
from app.models.exceptions import (
    ProviderError,
    ProviderMalformedResponseError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    ProviderValidationError,
)

logger = logging.getLogger(__name__)

DEFAULT_TEXT_MODEL = "j-hartmann/emotion-english-distilroberta-base"
DEFAULT_TIMEOUT_SECONDS = 10.0
DEFAULT_MAX_TEXT_LENGTH = 10_000
DEFAULT_PROVIDER = "hf-inference"


def generate_text_explanation(label: str, score: float | None = None) -> str:
    """Generate a factual, non-diagnostic explanation of the model prediction.

    Does not fabricate specific 'wording cues' or speculate on model reasoning,
    as the underlying classifier only outputs sequence-level label scores.
    """
    clean_label = label.strip().lower()
    score_str = f" with an uncalibrated score of {score:.2f}" if score is not None else ""
    return (
        f"Automated sequence classification estimated the tone as '{clean_label}'{score_str}. "
        "This estimate reflects statistical text classification patterns and does not determine a person's true feelings."
    )


def generate_baseline_explanation(label: str) -> str:
    """Generate an unmistakably labeled explanation for development baseline heuristics."""
    clean_label = label.strip().lower()
    return (
        f"[DEVELOPMENT ONLY] Heuristic keyword-rule estimate: '{clean_label}'. "
        "This is an offline rule-based heuristic for local development only, not a real model prediction."
    )


def parse_huggingface_predictions(
    data: Any,
) -> tuple[str, float, dict[str, float]]:
    """Parse and validate Hugging Face text classification predictions.

    Supports both `huggingface_hub` TextClassificationOutputElement items and dicts.
    Preserves the model's actual label and uncalibrated score without claiming
    they are calibrated probabilities.

    Raises:
        ProviderMalformedResponseError: When the payload is invalid, empty, or missing fields.
    """
    if not isinstance(data, list) or len(data) == 0:
        raise ProviderMalformedResponseError(
            "Provider response must be a non-empty list of predictions."
        )

    # Could be nested [[...]] or flat [...]
    items: Any = data[0] if isinstance(data[0], list) else data

    if not isinstance(items, list) or len(items) == 0:
        raise ProviderMalformedResponseError(
            "Provider response does not contain any classification items."
        )

    all_scores: dict[str, float] = {}
    top_label: str | None = None
    top_score: float = -1.0

    for item in items:
        raw_label = getattr(item, "label", None) if not isinstance(item, dict) else item.get("label")
        raw_score = getattr(item, "score", None) if not isinstance(item, dict) else item.get("score")

        if raw_label is None or not isinstance(raw_label, str) or not raw_label.strip():
            raise ProviderMalformedResponseError(
                "Prediction item is missing a valid 'label' string."
            )

        if raw_score is None or not isinstance(raw_score, (int, float)):
            raise ProviderMalformedResponseError(
                "Prediction item is missing a valid numeric 'score'."
            )

        # Preserve the model's actual label and score
        label = raw_label.strip()
        score = float(raw_score)

        # Clamp between 0.0 and 1.0 for contract safety
        score = max(0.0, min(1.0, score))
        all_scores[label] = score

        if score > top_score:
            top_score = score
            top_label = label

    if top_label is None or top_score < 0.0:
        raise ProviderMalformedResponseError(
            "Could not determine highest scoring prediction from provider response."
        )

    return top_label, top_score, all_scores


class HuggingFaceTextProvider(TextEmotionProvider):
    """Production text emotion provider using huggingface_hub.AsyncInferenceClient."""

    def __init__(
        self,
        model_id: str = DEFAULT_TEXT_MODEL,
        api_token: str | None = None,
        provider: str = DEFAULT_PROVIDER,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        max_text_length: int = DEFAULT_MAX_TEXT_LENGTH,
        client: AsyncInferenceClient | None = None,
    ) -> None:
        self.model_id = model_id.strip()
        self.api_token = api_token.strip() if api_token and api_token.strip() else None
        self.provider = provider.strip() if provider else DEFAULT_PROVIDER
        self.base_url = base_url.rstrip("/") if base_url and base_url.strip() else None
        self.timeout = float(timeout)
        self.max_text_length = int(max_text_length)

        self._client = client
        self._owns_client = client is None

    def __repr__(self) -> str:
        # Never print, log, or return the secret token
        return (
            f"HuggingFaceTextProvider(model_id={self.model_id!r}, "
            f"provider={self.provider!r}, timeout={self.timeout}, has_token={bool(self.api_token)})"
        )

    def _get_client(self) -> AsyncInferenceClient:
        if self._client is None:
            kwargs: dict[str, Any] = {
                "model": self.model_id,
                "token": self.api_token,
                "timeout": self.timeout,
            }
            if self.base_url:
                kwargs["base_url"] = self.base_url
            elif self.provider:
                kwargs["provider"] = self.provider

            self._client = AsyncInferenceClient(**kwargs)
            self._owns_client = True
        return self._client

    async def aclose(self) -> None:
        """Close underlying client sessions if owned by this provider."""
        if self._owns_client and self._client is not None:
            close_method = getattr(self._client, "close", None)
            if callable(close_method):
                res = close_method()
                if inspect.isawaitable(res):
                    await res

    async def __aenter__(self) -> HuggingFaceTextProvider:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self.aclose()

    def validate_input(self, text: Any) -> str:
        """Validate input text before dispatching to the provider."""
        if not isinstance(text, str):
            raise ProviderValidationError("Text input must be a string.")

        cleaned = text.strip()
        if not cleaned:
            raise ProviderValidationError("Text input must not be empty or whitespace only.")

        if len(cleaned) > self.max_text_length:
            raise ProviderValidationError(
                f"Text length exceeds maximum allowed limit of {self.max_text_length} characters."
            )

        return cleaned

    async def analyze_text(self, text: str) -> ModalityResult:
        """Analyze input text and return a normalized ModalityResult.

        Preserves the model's actual label and uncalibrated score.
        Never returns made-up or fallback predictions when inference fails.
        """
        cleaned_text = self.validate_input(text)

        # Never log submitted text or secrets
        logger.info(
            "Calling Hugging Face text provider model=%s provider=%s length=%d",
            self.model_id,
            self.provider,
            len(cleaned_text),
        )

        client = self._get_client()

        try:
            raw_output = await client.text_classification(
                text=cleaned_text,
                model=self.model_id,
            )
        except errors.InferenceTimeoutError as exc:
            logger.warning("Hugging Face inference timed out model=%s", self.model_id)
            raise ProviderTimeoutError(
                "The text analysis request timed out. Please try again."
            ) from exc
        except (errors.OverloadedError, errors.IncompleteGenerationError) as exc:
            logger.warning("Hugging Face model overloaded or loading model=%s", self.model_id)
            raise ProviderUnavailableError(
                "The text emotion model is currently loading or unavailable. Please try again later."
            ) from exc
        except errors.RepositoryNotFoundError as exc:
            logger.error("Hugging Face model not found model=%s", self.model_id)
            raise ProviderUnavailableError(
                f"Text emotion model '{self.model_id}' was not found on the provider."
            ) from exc
        except errors.BadRequestError as exc:
            logger.warning("Hugging Face rejected text classification input model=%s", self.model_id)
            raise ProviderValidationError(
                "The text analysis provider could not process the submitted text."
            ) from exc
        except errors.HfHubHTTPError as exc:
            status_code = getattr(exc.response, "status_code", None) if hasattr(exc, "response") else None
            server_message = (getattr(exc, "server_message", "") or str(exc)).lower()
            logger.error("Hugging Face HfHubHTTPError status=%s model=%s", status_code, self.model_id)

            if status_code == 429 or "rate limit" in server_message:
                raise ProviderRateLimitError(
                    "The text analysis service is currently rate limited. Please try again later."
                ) from exc
            if status_code in (401, 403) or "unauthorized" in server_message or "invalid token" in server_message:
                raise ProviderUnavailableError(
                    "Text emotion provider authentication failed. Check your local API token configuration."
                ) from exc
            if status_code == 503 or "loading" in server_message:
                raise ProviderUnavailableError(
                    "The text emotion model is currently loading on the provider. Please try again shortly."
                ) from exc
            if status_code in (400, 422):
                raise ProviderValidationError(
                    "The text analysis provider could not process the submitted text."
                ) from exc
            raise ProviderUnavailableError(
                "The text emotion provider encountered an upstream service error. Please try again later."
            ) from exc
        except (asyncio.TimeoutError, TimeoutError) as exc:
            logger.warning("Hugging Face inference timed out model=%s", self.model_id)
            raise ProviderTimeoutError(
                "The text analysis request timed out. Please try again."
            ) from exc
        except (aiohttp.ClientConnectionError, aiohttp.ClientConnectorError, ConnectionError) as exc:
            logger.error("Hugging Face connection error model=%s", self.model_id)
            raise ProviderUnavailableError(
                "Could not connect to the text emotion analysis provider. Please check network connectivity."
            ) from exc
        except aiohttp.ClientResponseError as exc:
            if exc.status == 429:
                raise ProviderRateLimitError("The text analysis service is currently rate limited. Please try again later.") from exc
            if exc.status in (401, 403):
                raise ProviderUnavailableError("Text emotion provider authentication failed. Check your local API token configuration.") from exc
            if exc.status == 503:
                raise ProviderUnavailableError("The text emotion model is currently loading or unavailable. Please try again later.") from exc
            raise ProviderUnavailableError("The text emotion provider returned an upstream error. Please try again later.") from exc
        except Exception as exc:
            if isinstance(exc, ProviderError):
                raise
            logger.error("Hugging Face unexpected inference error: %s", type(exc).__name__)
            raise ProviderUnavailableError(
                "A communication error occurred with the text emotion provider."
            ) from exc

        top_label, top_score, all_scores = parse_huggingface_predictions(raw_output)
        explanation = generate_text_explanation(top_label, top_score)

        return ModalityResult(
            label=top_label,
            confidence=top_score,
            explanation=explanation,
            all_scores=all_scores,
        )


class BaselineTextProvider(TextEmotionProvider):
    """Deterministic baseline text emotion provider for local offline development only."""

    def __init__(self, max_text_length: int = DEFAULT_MAX_TEXT_LENGTH) -> None:
        self.max_text_length = int(max_text_length)

    def validate_input(self, text: Any) -> str:
        """Validate input text."""
        if not isinstance(text, str):
            raise ProviderValidationError("Text input must be a string.")

        cleaned = text.strip()
        if not cleaned:
            raise ProviderValidationError("Text input must not be empty or whitespace only.")

        if len(cleaned) > self.max_text_length:
            raise ProviderValidationError(
                f"Text length exceeds maximum allowed limit of {self.max_text_length} characters."
            )

        return cleaned

    async def analyze_text(self, text: str) -> ModalityResult:
        """Analyze text using simple deterministic keyword rules.

        Unmistakably labels the result as development-only and never claims to be a real model prediction.
        """
        cleaned = self.validate_input(text)
        lower = cleaned.lower()

        # Deterministic keyword detection matching project baseline conventions
        if any(w in lower for w in ("worried", "concerned", "problem", "issue", "sorry", "difficult", "upset")):
            base_label = "sadness"
            score = 0.79
        elif any(w in lower for w in ("thanks", "thank you", "great", "happy", "appreciate", "excellent", "love")):
            base_label = "joy"
            score = 0.88
        elif any(w in lower for w in ("angry", "furious", "terrible", "hate", "unacceptable", "ridiculous")):
            base_label = "anger"
            score = 0.85
        elif any(w in lower for w in ("scared", "afraid", "fear", "terrified", "panic")):
            base_label = "fear"
            score = 0.81
        elif any(w in lower for w in ("wow", "surprise", "unexpected", "astonishing", "shocking")):
            base_label = "surprise"
            score = 0.77
        elif any(w in lower for w in ("disgust", "gross", "nasty", "revolting", "awful")):
            base_label = "disgust"
            score = 0.80
        else:
            base_label = "neutral"
            score = 0.72

        label = f"{base_label} (dev-baseline)"
        explanation = generate_baseline_explanation(base_label)

        return ModalityResult(
            label=label,
            confidence=score,
            explanation=explanation,
            all_scores={label: score},
        )
