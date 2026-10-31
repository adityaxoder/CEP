"""Text emotion provider implementations and response normalizers."""

from __future__ import annotations

import asyncio
import inspect
import logging
import re
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
    """Local explainable wording-cue rules for the offline classroom demo."""

    RULES: dict[str, tuple[str, ...]] = {
        "positive": (
            "good", "great", "excellent", "wonderful", "fantastic", "amazing", "awesome", "love", "enjoy",
            "happy", "glad", "pleased", "delighted", "excited", "grateful", "thankful", "appreciate", "thanks",
            "thank you", "well done", "nice work", "great job", "looks good", "sounds good", "that helps", "helpful",
            "brilliant", "perfect", "beautiful", "proud", "hopeful", "confident", "looking forward", "welcome",
            "congratulations", "congrats", "support", "inspiring", "impressed", "satisfied", "relieved", "kind",
            "generous", "thoughtful", "useful", "success", "successful", "win", "positive", "cheerful", "fun",
            "enjoyable", "peaceful", "calm", "safe", "trust", "respect", "agree", "absolutely", "yes",
        ),
        "concern": (
            "worried", "concerned", "anxious", "nervous", "afraid", "scared", "fear", "uncertain", "unsure", "doubt",
            "confused", "lost", "stuck", "struggling", "difficult", "hard time", "hard to", "challenging", "problem", "issue", "trouble",
            "risk", "unsafe", "hurt", "sad", "unhappy", "disappointed", "upset", "lonely", "tired", "exhausted",
            "overwhelmed", "stressed", "stressful", "frustrated", "sorry", "apologize", "apologies", "regret", "miss",
            "missing", "fail", "failed", "failure", "late", "delay", "delayed", "can't", "cannot", "unable", "need help",
            "not sure", "not working", "doesn't work", "didn't work", "what happened", "please help", "help me",
            "could you explain", "unclear", "unfortunately", "issue with", "having trouble", "feeling down", "bad day",
        ),
        "frustration": (
            "angry", "mad", "furious", "annoyed", "irritated", "frustrated", "fed up", "sick of", "hate", "ridiculous",
            "unacceptable", "disgusting", "awful", "terrible", "horrible", "worst", "stupid", "waste", "useless", "absurd",
            "outrageous", "incompetent", "disrespectful", "unprofessional", "lazy", "careless", "impossible", "never again",
            "this is unacceptable", "what is wrong", "does not make sense", "not okay", "not acceptable", "so annoying",
            "fed up with", "had enough", "stop doing", "you failed", "you ignored", "you never", "you always", "screwed up",
            "mess", "broken", "ridiculous", "pathetic", "furious about", "angry about", "annoying", "irritating",
            "wasted my time", "wasting time", "don't care", "do not care", "absolutely not", "no way",
        ),
    }

    EXTRA_RULES: dict[str, tuple[str, ...]] = {
        "positive": (
            "accomplished", "accomplishment", "adore", "affection", "agreeable", "at ease", "a pleasure", "best wishes",
            "bravo", "can do", "care", "caring", "charming", "comfortable", "commend", "compliment", "delightful",
            "encouraging", "enjoyed", "enthusiasm", "enthusiastic", "excellent work", "fantastic work", "feel better",
            "feel great", "feel good", "fine", "forgive", "friendly", "glad to hear", "good news", "good idea",
            "good luck", "good point", "graceful", "haha", "ha ha", "heartfelt", "honored", "improve", "improved",
            "improvement", "joy", "joyful", "laugh", "laughter", "liked", "lovely", "magnificent", "marvelous",
            "meaningful", "motivated", "optimistic", "outstanding", "overjoyed", "pleasant", "pleasure", "reassured",
            "recommend", "recommendation", "rewarding", "safe and sound", "smile", "smiling", "so proud", "splendid",
            "terrific", "thank you so much", "thanks a lot", "thrilled", "top notch", "understand", "valued", "welcome aboard",
            "well appreciated", "well received", "you helped", "you are amazing", "you are great", "you did well",
        ),
        "concern": (
            "abandoned", "alone", "apprehensive", "ashamed", "breakdown", "cannot understand", "can't understand", "concern",
            "concerns me", "cry", "crying", "depressed", "desperate", "devastated", "embarrassed", "emergency", "error",
            "fail to", "feeling anxious", "feeling worried", "feel bad", "feel worse", "forgot", "forgotten", "grief", "grieving",
            "helpless", "hesitant", "ill", "injured", "in pain", "in trouble", "inconvenient", "inconvenience", "is there a problem",
            "let down", "let me down", "missed", "missing out", "mistake", "mistakes", "need support", "not okay", "not ready",
            "not feeling well", "not feeling good", "panic", "panicked", "pressure", "pressured", "regretful", "rough day",
            "scary", "shaky", "sick", "sorrow", "sorry to hear", "strange", "unclear to me", "uncomfortable", "unwell",
            "vulnerable", "what should i do", "what do i do", "wish i knew", "worst day", "worried about", "wrong with",
            "you seem upset", "you seem worried", "not confident", "need assistance", "please clarify", "please explain",
        ),
        "frustration": (
            "annoyed with", "are you kidding", "at my limit", "bad service", "blame", "blaming", "cancel this", "completely wrong",
            "couldn't care less", "cut it out", "deceived", "disappointed in you", "doesn't listen", "don't listen", "done with this",
            "embarrassing", "enough already", "fed up now", "get lost", "give it back", "go away", "how dare you", "i demand",
            "i refuse", "i'm done", "i am done", "i've had enough", "i have had enough", "ignored me", "inexcusable", "insane",
            "it's a joke", "it is a joke", "keep messing", "leave me alone", "liar", "lied", "makes me angry", "makes no sense",
            "not impressed", "not listening", "not what i asked", "offensive", "poor quality", "quit wasting", "remove this",
            "ridiculously bad", "shut up", "so disappointed", "stop it", "stop this", "that's enough", "that is enough",
            "this is a joke", "this is nonsense", "this sucks", "totally useless", "unbelievable", "unfair", "unfairly",
            "very annoying", "what a mess", "what the hell", "why would you", "you are wrong", "you messed up", "you ruined",
        ),
    }

    NEGATIONS = {"not", "no", "never", "hardly", "barely", "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't", "can't", "cannot", "won't", "wouldn't"}

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

    @staticmethod
    def _variants(phrase: str) -> tuple[str, ...]:
        """Add a few common English inflections for one-word cues."""
        forms = [phrase]
        if " " in phrase or len(phrase) < 4:
            return tuple(forms)
        if phrase.endswith("y") and len(phrase) > 4:
            forms.extend((phrase[:-1] + "ies", phrase[:-1] + "ied", phrase + "ing"))
        elif phrase.endswith("e"):
            forms.extend((phrase + "s", phrase + "d", phrase[:-1] + "ing"))
        else:
            forms.extend((phrase + "s", phrase + "es", phrase + "ed", phrase + "ing"))
        return tuple(forms)

    async def analyze_text(self, text: str) -> ModalityResult:
        """Match a curated local vocabulary and return the evidence, without a confidence score."""
        cleaned = self.validate_input(text)
        lower = cleaned.lower()
        evidence_by_category: dict[str, list[str]] = {}
        for category, phrases in self.RULES.items():
            phrases = (*phrases, *self.EXTRA_RULES[category])
            matches: list[str] = []
            for phrase in phrases:
                found = False
                for variant in self._variants(phrase):
                    pattern = rf"(?<!\w){re.escape(variant)}(?!\w)"
                    for match in re.finditer(pattern, lower):
                        prefix = lower[:match.start()]
                        prefix = re.split(r"[.!?;,:]|\b(?:but|however|yet|although)\b", prefix)[-1]
                        prefix_words = re.findall(r"[\w']+", prefix)
                        if self.NEGATIONS.intersection(prefix_words[-3:]):
                            continue
                        matches.append(match.group(0))
                        found = True
                        break
                    if found:
                        break
            if matches:
                evidence_by_category[category] = matches

        categories = set(evidence_by_category)
        if len(categories) > 1:
            label = "Mixed"
            description = "Rules matched wording from more than one cue group."
        elif categories:
            category = next(iter(categories))
            label = {"positive": "Positive wording", "concern": "Concern wording", "frustration": "Frustration wording"}[category]
            description = f"Rules matched wording associated with {category} cues."
        else:
            label = "No clear cue"
            description = "No supported positive, concern, or frustration wording rule matched this text."

        evidence = [phrase for phrases in evidence_by_category.values() for phrase in phrases]
        explanation = (
            f"Rule-based wording cue. {description} "
            + (f"Matched evidence: {', '.join(evidence)}." if evidence else "No matching evidence was found.")
            + " This does not determine the writer's real feelings or account for context or sarcasm."
        )

        return ModalityResult(
            label=label,
            confidence=None,
            explanation=explanation,
            all_scores=None,
            method="rule-based",
            evidence=evidence,
        )
