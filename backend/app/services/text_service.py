"""Text emotion analysis orchestration and provider factory."""

from __future__ import annotations

from app.api.schemas import ReadinessState
from app.config import Settings, get_settings
from app.models.base import ModalityResult, TextEmotionProvider
from app.models.exceptions import ProviderValidationError
from app.models.text import BaselineTextProvider, HuggingFaceTextProvider


def get_text_provider(settings: Settings | None = None) -> TextEmotionProvider:
    """Return the configured text emotion provider based on application settings.

    Guarantees:
    - Production configuration strictly forbids the heuristic baseline provider and defaults
      to the real model.
    - Heuristic baseline is available only through an explicit development setting (`allow_dev_baseline=True`).
    - Does NOT automatically fall back to baseline heuristics if the real provider fails.
    """
    resolved_settings = settings or get_settings()
    is_baseline = resolved_settings.text_model_name.strip().lower() == "baseline"

    if is_baseline:
        if resolved_settings.app_env == "production":
            raise ProviderValidationError(
                "The heuristic baseline text provider is strictly forbidden in production environments. "
                "Configure a valid model ID such as 'j-hartmann/emotion-english-distilroberta-base'."
            )
        if not resolved_settings.allow_dev_baseline and resolved_settings.app_env != "test":
            raise ProviderValidationError(
                "The heuristic baseline text provider is disabled. "
                "Set ALLOW_DEV_BASELINE=true in development settings to enable it."
            )
        return BaselineTextProvider(
            max_text_length=resolved_settings.max_text_length,
        )

    return HuggingFaceTextProvider(
        model_id=resolved_settings.text_model_name,
        api_token=resolved_settings.hf_api_token,
        provider=resolved_settings.hf_inference_provider,
        base_url=resolved_settings.hf_inference_api_url,
        timeout=resolved_settings.text_model_timeout_seconds,
        max_text_length=resolved_settings.max_text_length,
    )


def get_text_readiness(settings: Settings | None = None) -> ReadinessState:
    """Check text emotion provider configuration readiness."""
    resolved = settings or get_settings()
    is_baseline = resolved.text_model_name.strip().lower() == "baseline"

    if is_baseline:
        if resolved.app_env == "production":
            return "unavailable"
        if resolved.allow_dev_baseline or resolved.app_env == "test":
            return "ready"
        return "unavailable"

    if resolved.text_model_name.strip():
        return "ready"

    return "unavailable"


async def analyze_text_emotion(
    text: str,
    provider: TextEmotionProvider | None = None,
    settings: Settings | None = None,
) -> ModalityResult:
    """Validate and analyze text input using the active text provider.

    Does NOT catch provider errors or fall back to baseline heuristics when real inference fails.
    """
    active_provider = provider or get_text_provider(settings)
    return await active_provider.analyze_text(text)
