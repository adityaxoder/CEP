"""Unit tests for the Hugging Face text emotion provider and normalizer."""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import AsyncMock

import aiohttp
from huggingface_hub import errors
from huggingface_hub.inference._generated.types.text_classification import TextClassificationOutputElement
import pytest

from app.config import Settings
from app.models.base import ModalityResult, TextEmotionProvider
from app.models.exceptions import (
    ProviderError,
    ProviderMalformedResponseError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    ProviderValidationError,
)
from app.models.text import (
    BaselineTextProvider,
    HuggingFaceTextProvider,
    generate_baseline_explanation,
    generate_text_explanation,
    parse_huggingface_predictions,
)
from app.services.text_service import (
    analyze_text_emotion,
    get_text_provider,
    get_text_readiness,
)


def make_mock_client(
    return_value: Any = None,
    side_effect: Exception | None = None,
) -> AsyncMock:
    """Create an AsyncInferenceClient mock for provider test isolation."""
    mock_client = AsyncMock()
    if side_effect:
        mock_client.text_classification.side_effect = side_effect
    else:
        mock_client.text_classification.return_value = return_value
    return mock_client


# ---------------------------------------------------------------------------
# 1. Success, response formats, and factual explanations
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_huggingface_success_output_elements() -> None:
    """Test standard response using TextClassificationOutputElement objects."""
    elements = [
        TextClassificationOutputElement(label="joy", score=0.9523),
        TextClassificationOutputElement(label="neutral", score=0.0312),
        TextClassificationOutputElement(label="surprise", score=0.0101),
        TextClassificationOutputElement(label="sadness", score=0.0032),
        TextClassificationOutputElement(label="fear", score=0.0018),
        TextClassificationOutputElement(label="anger", score=0.0011),
        TextClassificationOutputElement(label="disgust", score=0.0003),
    ]
    mock_client = make_mock_client(return_value=elements)
    provider = HuggingFaceTextProvider(
        model_id="j-hartmann/emotion-english-distilroberta-base",
        api_token="dummy-test-token",
        client=mock_client,
    )

    result = await provider.analyze_text("I am so delighted with this outcome!")

    assert isinstance(result, ModalityResult)
    assert result.label == "joy"
    assert result.confidence == 0.9523
    assert result.all_scores is not None
    assert result.all_scores["joy"] == 0.9523
    assert result.all_scores["neutral"] == 0.0312
    # Verify factual explanation
    assert "estimated the tone as 'joy' with an uncalibrated score of 0.95" in result.explanation
    assert "does not determine a person's true feelings" in result.explanation


@pytest.mark.anyio
async def test_huggingface_success_nested_dict_format() -> None:
    """Test support for nested dicts format."""
    mock_response = [
        [
            {"label": "anger", "score": 0.8841},
            {"label": "disgust", "score": 0.0521},
            {"label": "neutral", "score": 0.0638},
        ]
    ]
    mock_client = make_mock_client(return_value=mock_response)
    provider = HuggingFaceTextProvider(client=mock_client)

    result = await provider.analyze_text("This behavior is completely unacceptable.")

    assert result.label == "anger"
    assert result.confidence == 0.8841
    assert "estimated the tone as 'anger' with an uncalibrated score of 0.88" in result.explanation


@pytest.mark.anyio
async def test_huggingface_preserves_actual_label_and_score() -> None:
    """Verify provider preserves exact model label and uncalibrated score."""
    mock_response = [
        {"label": "neutral", "score": 0.734567},
        {"label": "joy", "score": 0.201234},
    ]
    mock_client = make_mock_client(return_value=mock_response)
    provider = HuggingFaceTextProvider(client=mock_client)

    result = await provider.analyze_text("The meeting is scheduled for 3pm tomorrow.")

    assert result.label == "neutral"
    assert result.confidence == 0.734567


def test_factual_explanations_avoid_unsupported_wording_cue_claims() -> None:
    """Ensure explanations do not fabricate 'wording cues' and remain factual."""
    explanation = generate_text_explanation("joy", 0.95)
    # Must NOT claim specific wording cues that the model does not identify
    assert "wording cues" not in explanation
    assert "observed wording" not in explanation
    assert "feels" not in explanation
    # Must be factual about sequence classification
    assert "sequence classification" in explanation.lower()
    assert "0.95" in explanation
    assert "does not determine a person's true feelings" in explanation


def test_parse_huggingface_clamping() -> None:
    """Verify confidence values outside 0-1 are safely clamped."""
    data = [{"label": "joy", "score": 1.25}]
    label, score, _ = parse_huggingface_predictions(data)
    assert score == 1.0

    data_low = [{"label": "sadness", "score": -0.15}]
    label, score, _ = parse_huggingface_predictions(data_low)
    assert score == 0.0


# ---------------------------------------------------------------------------
# 2. Input validation tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
@pytest.mark.parametrize(
    "invalid_input,error_match",
    [
        (None, "Text input must be a string"),
        (12345, "Text input must be a string"),
        ("", "Text input must not be empty or whitespace only"),
        ("   ", "Text input must not be empty or whitespace only"),
        ("\n\t  \r", "Text input must not be empty or whitespace only"),
    ],
)
async def test_invalid_text_inputs_rejected(invalid_input: Any, error_match: str) -> None:
    """Verify invalid or empty inputs raise ProviderValidationError."""
    provider = HuggingFaceTextProvider()
    with pytest.raises(ProviderValidationError) as exc_info:
        await provider.analyze_text(invalid_input)

    assert exc_info.value.code == "INVALID_INPUT"
    assert exc_info.value.status_code == 400
    assert error_match in exc_info.value.message


@pytest.mark.anyio
async def test_text_exceeding_max_length_rejected() -> None:
    """Verify text exceeding max_text_length is rejected with ProviderValidationError."""
    provider = HuggingFaceTextProvider(max_text_length=50)
    oversized = "a" * 51

    with pytest.raises(ProviderValidationError) as exc_info:
        await provider.analyze_text(oversized)

    assert exc_info.value.code == "INVALID_INPUT"
    assert "exceeds maximum allowed limit" in exc_info.value.message


# ---------------------------------------------------------------------------
# 3. Timeout handling
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_provider_inference_timeout_raises_typed_error() -> None:
    """Verify InferenceTimeoutError maps to ProviderTimeoutError (504 MODEL_TIMEOUT)."""
    mock_client = make_mock_client(side_effect=errors.InferenceTimeoutError("Inference timed out"))
    provider = HuggingFaceTextProvider(client=mock_client)

    with pytest.raises(ProviderTimeoutError) as exc_info:
        await provider.analyze_text("Valid text sample")

    assert exc_info.value.code == "MODEL_TIMEOUT"
    assert exc_info.value.status_code == 504
    assert "timed out" in exc_info.value.message.lower()


@pytest.mark.anyio
async def test_provider_asyncio_timeout_raises_typed_error() -> None:
    """Verify asyncio.TimeoutError maps to ProviderTimeoutError."""
    mock_client = make_mock_client(side_effect=TimeoutError("Request timed out"))
    provider = HuggingFaceTextProvider(client=mock_client)

    with pytest.raises(ProviderTimeoutError) as exc_info:
        await provider.analyze_text("Valid text sample")

    assert exc_info.value.code == "MODEL_TIMEOUT"


# ---------------------------------------------------------------------------
# 4. Rate limit handling
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_provider_rate_limit_raises_typed_error() -> None:
    """Verify HfHubHTTPError with rate limit maps to ProviderRateLimitError (429)."""
    from unittest.mock import MagicMock
    mock_resp = MagicMock()
    mock_resp.status_code = 429
    http_err = errors.HfHubHTTPError("Rate limit reached", response=mock_resp, server_message="429 Rate limit reached")
    mock_client = make_mock_client(side_effect=http_err)
    provider = HuggingFaceTextProvider(client=mock_client)

    with pytest.raises(ProviderRateLimitError) as exc_info:
        await provider.analyze_text("Valid text sample")

    assert exc_info.value.code == "RATE_LIMITED"
    assert exc_info.value.status_code == 429
    assert "rate limited" in exc_info.value.message.lower()


# ---------------------------------------------------------------------------
# 5. Unavailable service and model errors
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_provider_overloaded_loading_raises_unavailable() -> None:
    """Verify OverloadedError maps to ProviderUnavailableError (503 MODEL_UNAVAILABLE)."""
    mock_client = make_mock_client(side_effect=errors.OverloadedError("Model currently loading"))
    provider = HuggingFaceTextProvider(client=mock_client)

    with pytest.raises(ProviderUnavailableError) as exc_info:
        await provider.analyze_text("Valid text sample")

    assert exc_info.value.code == "MODEL_UNAVAILABLE"
    assert exc_info.value.status_code == 503
    assert "loading or unavailable" in exc_info.value.message.lower()


@pytest.mark.anyio
async def test_provider_model_not_found_raises_unavailable() -> None:
    """Verify RepositoryNotFoundError maps to ProviderUnavailableError (503)."""
    from unittest.mock import MagicMock
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_client = make_mock_client(side_effect=errors.RepositoryNotFoundError("Repository Not Found", response=mock_resp))
    provider = HuggingFaceTextProvider(model_id="nonexistent-model", client=mock_client)

    with pytest.raises(ProviderUnavailableError) as exc_info:
        await provider.analyze_text("Valid text sample")

    assert exc_info.value.code == "MODEL_UNAVAILABLE"
    assert exc_info.value.status_code == 503
    assert "nonexistent-model" in exc_info.value.message


@pytest.mark.anyio
async def test_provider_connection_failure_raises_unavailable() -> None:
    """Verify connection errors map to ProviderUnavailableError."""
    mock_client = make_mock_client(side_effect=aiohttp.ClientConnectionError("Failed to connect"))
    provider = HuggingFaceTextProvider(client=mock_client)

    with pytest.raises(ProviderUnavailableError) as exc_info:
        await provider.analyze_text("Valid text sample")

    assert exc_info.value.code == "MODEL_UNAVAILABLE"
    assert exc_info.value.status_code == 503


@pytest.mark.anyio
async def test_provider_authentication_failure_raises_unavailable() -> None:
    """Verify auth errors map to ProviderUnavailableError without leaking token."""
    from unittest.mock import MagicMock
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    http_err = errors.HfHubHTTPError("Invalid token", response=mock_resp, server_message="401 Unauthorized: Invalid token")
    mock_client = make_mock_client(side_effect=http_err)
    provider = HuggingFaceTextProvider(api_token="secret_token_12345", client=mock_client)

    with pytest.raises(ProviderUnavailableError) as exc_info:
        await provider.analyze_text("Valid text sample")

    assert exc_info.value.code == "MODEL_UNAVAILABLE"
    assert exc_info.value.status_code == 503
    assert "secret_token_12345" not in exc_info.value.message


# ---------------------------------------------------------------------------
# 6. Malformed response handling
# ---------------------------------------------------------------------------

@pytest.mark.anyio
@pytest.mark.parametrize(
    "malformed_payload",
    [
        [],
        [[]],
        ["not_a_dict"],
        [{"wrong_key": "val"}],
        [{"label": "joy"}],  # missing score
        [{"score": 0.8}],    # missing label
        [{"label": "joy", "score": "not-a-number"}],
        [{"label": "", "score": 0.9}],
    ],
)
async def test_malformed_responses_raise_typed_error(malformed_payload: Any) -> None:
    """Verify non-conforming provider responses raise ProviderMalformedResponseError (502)."""
    mock_client = make_mock_client(return_value=malformed_payload)
    provider = HuggingFaceTextProvider(client=mock_client)

    with pytest.raises(ProviderMalformedResponseError) as exc_info:
        await provider.analyze_text("Valid text sample")

    assert exc_info.value.code == "MALFORMED_RESPONSE"
    assert exc_info.value.status_code == 502


# ---------------------------------------------------------------------------
# 7. No made-up predictions or fallback on failure
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_inference_failure_never_returns_fallback_prediction() -> None:
    """Verify that when inference fails, an exception is raised rather than a made-up result."""
    from unittest.mock import MagicMock
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_client = make_mock_client(side_effect=errors.HfHubHTTPError("500 Server Error", response=mock_resp))
    provider = HuggingFaceTextProvider(client=mock_client)

    with pytest.raises(ProviderError):
        await provider.analyze_text("Important sentence")


# ---------------------------------------------------------------------------
# 8. Security and privacy checks
# ---------------------------------------------------------------------------

def test_repr_does_not_leak_api_token() -> None:
    """Ensure the provider string representation does not expose secret tokens."""
    provider = HuggingFaceTextProvider(api_token="hf_secret_12345_token")
    representation = repr(provider)

    assert "hf_secret_12345_token" not in representation
    assert "has_token=True" in representation


# ---------------------------------------------------------------------------
# 9. Baseline provider behavior and guardrails
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_baseline_text_provider_unmistakably_labeled() -> None:
    """Verify baseline provider result is unmistakably labeled as development-only."""
    provider = BaselineTextProvider()

    happy_result = await provider.analyze_text("Thank you so much, this is great!")
    assert happy_result.label == "joy (dev-baseline)"
    assert happy_result.confidence == 0.88
    assert "[DEVELOPMENT ONLY]" in happy_result.explanation
    assert "not a real model prediction" in happy_result.explanation


def test_baseline_forbidden_in_production() -> None:
    """Verify baseline provider is strictly rejected in production configuration."""
    prod_settings = Settings(
        app_env="production",
        text_model_name="baseline",
        allow_dev_baseline=True,
    )
    with pytest.raises(ProviderValidationError) as exc_info:
        get_text_provider(prod_settings)

    assert "strictly forbidden in production" in exc_info.value.message


def test_baseline_requires_explicit_development_setting() -> None:
    """Verify baseline provider requires allow_dev_baseline=True in development."""
    dev_settings = Settings(
        app_env="development",
        text_model_name="baseline",
        allow_dev_baseline=False,
    )
    with pytest.raises(ProviderValidationError) as exc_info:
        get_text_provider(dev_settings)

    assert "ALLOW_DEV_BASELINE=true" in exc_info.value.message


def test_baseline_permitted_when_explicitly_enabled_in_development() -> None:
    """Verify baseline provider succeeds when explicitly enabled in development."""
    dev_settings = Settings(
        app_env="development",
        text_model_name="baseline",
        allow_dev_baseline=True,
    )
    provider = get_text_provider(dev_settings)
    assert isinstance(provider, BaselineTextProvider)


# ---------------------------------------------------------------------------
# 10. Service orchestration and readiness
# ---------------------------------------------------------------------------

def test_get_text_provider_production_defaults_to_real_model() -> None:
    """Verify production settings return HuggingFaceTextProvider."""
    prod_settings = Settings(
        app_env="production",
        text_model_name="j-hartmann/emotion-english-distilroberta-base",
    )
    provider = get_text_provider(prod_settings)
    assert isinstance(provider, HuggingFaceTextProvider)
    assert provider.model_id == "j-hartmann/emotion-english-distilroberta-base"


def test_get_text_readiness_respects_environment() -> None:
    """Verify readiness reports unavailable for baseline in production."""
    prod_baseline = Settings(app_env="production", text_model_name="baseline")
    assert get_text_readiness(prod_baseline) == "unavailable"

    prod_real = Settings(app_env="production", text_model_name="j-hartmann/emotion-english-distilroberta-base")
    assert get_text_readiness(prod_real) == "ready"


@pytest.mark.anyio
async def test_analyze_text_emotion_does_not_swallow_errors() -> None:
    """Verify analyze_text_emotion does not catch errors or fall back to baseline."""
    mock_provider = AsyncMock(spec=TextEmotionProvider)
    mock_provider.analyze_text.side_effect = ProviderUnavailableError("Model down")

    with pytest.raises(ProviderUnavailableError):
        await analyze_text_emotion("Test text", provider=mock_provider)


# ---------------------------------------------------------------------------
# 11. Opt-in real Hugging Face smoke test (skipped by default)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not os.getenv("RUN_HF_SMOKE_TEST"),
    reason="Opt-in Hugging Face smoke test. Set RUN_HF_SMOKE_TEST=1 with HF_API_TOKEN to run.",
)
@pytest.mark.anyio
async def test_real_huggingface_smoke_opt_in() -> None:
    """Opt-in real network smoke test against Hugging Face inference API."""
    token = os.getenv("HF_API_TOKEN")
    async with HuggingFaceTextProvider(api_token=token) as provider:
        result = await provider.analyze_text("I am so grateful and thrilled for your support!")
        assert isinstance(result, ModalityResult)
        assert result.label in {"joy", "surprise", "neutral", "sadness", "fear", "anger", "disgust"}
        assert 0.0 <= result.confidence <= 1.0
        assert "estimated the tone as" in result.explanation
