"""Provider-neutral model adapter interfaces and implementations."""

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

__all__ = [
    "ModalityResult",
    "TextEmotionProvider",
    "ProviderError",
    "ProviderValidationError",
    "ProviderTimeoutError",
    "ProviderRateLimitError",
    "ProviderUnavailableError",
    "ProviderMalformedResponseError",
    "HuggingFaceTextProvider",
    "BaselineTextProvider",
    "generate_baseline_explanation",
    "generate_text_explanation",
    "parse_huggingface_predictions",
]
