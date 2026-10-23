"""Text emotion and sentiment analysis model.

Connects text input to sentiment classification, returning model name, label,
confidence (0-100), and task. Supports both transformers pipeline and a deterministic
fallback for offline / lightweight environments.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)

try:
    from transformers import pipeline
except ImportError:
    pipeline = None


class TextModel:
    """Sentiment classification model for text inputs."""

    def __init__(self, model_name: str = "distilbert/distilbert-base-uncased-finetuned-sst-2-english") -> None:
        self.model_name = model_name
        self.classifier = None

        if pipeline is not None:
            try:
                self.classifier = pipeline("sentiment-analysis", model=self.model_name)
            except Exception as err:
                logger.warning("Could not initialize transformers text pipeline: %s. Using baseline fallback.", err)
                self.classifier = None

    def _fallback_predict(self, text: str) -> tuple[str, float]:
        """Offline deterministic keyword-based sentiment baseline."""
        lower = text.lower()
        if re.search(r"\b(happy|great|good|love|wonderful|glad|excellent|thanks|joy|positive|delighted)\b", lower):
            return "POSITIVE", 89.50
        if re.search(r"\b(sad|bad|terrible|awful|hate|angry|worried|problem|upset|difficult|negative|frown)\b", lower):
            return "NEGATIVE", 84.50
        return "NEUTRAL", 72.00

    def predict(self, text: Any) -> dict[str, Any]:
        """Classify sentiment of input text.

        Returns:
            dict containing model, label, confidence (0-100), and task ("sentiment").
        """
        if not text or not str(text).strip():
            return {
                "model": "Text Model",
                "label": "UNKNOWN",
                "confidence": 0.0,
                "task": "sentiment",
                "error": "No text provided",
            }

        cleaned = str(text).strip()

        try:
            if self.classifier is not None:
                result = self.classifier(cleaned[:2000])[0]
                raw_score = float(result["score"])
                confidence = round(raw_score * 100 if raw_score <= 1.0 else raw_score, 2)
                label = str(result["label"]).upper()
                return {
                    "model": "Text Model",
                    "label": label,
                    "confidence": confidence,
                    "task": "sentiment",
                }

            label, confidence = self._fallback_predict(cleaned)
            return {
                "model": "Text Model",
                "label": label,
                "confidence": confidence,
                "task": "sentiment",
            }

        except Exception as e:
            return {
                "model": "Text Model",
                "label": "ERROR",
                "confidence": 0.0,
                "task": "sentiment",
                "error": str(e),
            }


_text_model_instance: Optional[TextModel] = None


def get_text_model() -> TextModel:
    """Get or initialize singleton instance of TextModel."""
    global _text_model_instance
    if _text_model_instance is None:
        _text_model_instance = TextModel()
    return _text_model_instance


def analyze_text(text: Any) -> dict[str, Any]:
    """Analyze text sentiment and return model name, label, confidence, and task."""
    return get_text_model().predict(text)