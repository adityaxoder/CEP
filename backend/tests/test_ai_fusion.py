"""Unit and integration tests for Ai&Fusion prediction fusion and model connectors."""

import os
import sys
from pathlib import Path

from PIL import Image
import pytest

# Ensure Ai&Fusion and its models directory are in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
AI_FUSION_DIR = REPO_ROOT / "Ai&Fusion"
MODELS_DIR = AI_FUSION_DIR / "models"

for path_entry in (str(REPO_ROOT), str(AI_FUSION_DIR), str(MODELS_DIR)):
    if path_entry not in sys.path:
        sys.path.insert(0, path_entry)

from ai_fusion import fuse_predictions
from models.text_model import TextModel, analyze_text
from models.image_models import ImageModel, analyze_image
from models.voice_models import VoiceModel, analyze_voice


def test_fuse_predictions_empty_or_invalid():
    """Verify empty or malformed inputs return safe fallback response without crashing."""
    empty_result = fuse_predictions([])
    assert empty_result["models"] == []
    assert empty_result["fusion_results"] == {}
    assert empty_result["mismatches"] == []
    assert empty_result["message"] == "No valid predictions available."

    invalid_predictions = [
        None,
        "not a dict",
        {"label": "HAPPY"},  # missing confidence and task
        {"label": "HAPPY", "confidence": "high", "task": "sentiment"},  # non-numeric confidence
        {"label": "HAPPY", "confidence": -5.0, "task": "sentiment"},  # negative confidence
        {"label": "HAPPY", "confidence": 150.0, "task": "sentiment"},  # confidence > 100
        {"label": "HAPPY", "confidence": True, "task": "sentiment"},  # boolean confidence
        {"label": "", "confidence": 80.0, "task": "sentiment"},  # empty label
        {"label": "HAPPY", "confidence": 80.0, "task": ""},  # empty task
    ]
    invalid_result = fuse_predictions(invalid_predictions)
    assert invalid_result["models"] == []
    assert invalid_result["message"] == "No valid predictions available."


def test_fuse_predictions_single_model():
    """Verify single modality prediction formats correctly without mismatch."""
    predictions = [
        {
            "model": "Text Model",
            "label": "POSITIVE",
            "confidence": 85.5,
            "task": "sentiment",
        }
    ]
    result = fuse_predictions(predictions)
    assert len(result["models"]) == 1
    assert result["models"][0]["label"] == "POSITIVE"
    assert result["models"][0]["confidence"] == 85.5

    assert "sentiment" in result["fusion_results"]
    assert result["fusion_results"]["sentiment"]["label"] == "POSITIVE"
    assert result["fusion_results"]["sentiment"]["confidence"] == 100.0
    assert result["fusion_results"]["sentiment"]["models_available"] == 1

    assert result["mismatches"] == []
    assert "No disagreements detected" in result["message"]


def test_fuse_predictions_agreeing_models():
    """Verify multiple models agreeing on label produce high confidence and no mismatches."""
    predictions = [
        {
            "model": "Text Model",
            "label": "POSITIVE",
            "confidence": 90.0,
            "task": "sentiment",
        },
        {
            "model": "Voice Model",
            "label": "POSITIVE",
            "confidence": 80.0,
            "task": "sentiment",
        },
    ]
    result = fuse_predictions(predictions)
    assert len(result["models"]) == 2
    sentiment_fusion = result["fusion_results"]["sentiment"]
    assert sentiment_fusion["label"] == "POSITIVE"
    assert sentiment_fusion["confidence"] == 100.0
    assert sentiment_fusion["models_available"] == 2
    assert result["mismatches"] == []


def test_fuse_predictions_conflicting_models_flags_mismatch():
    """Verify conflicting predictions within the same task trigger mismatch detection with observational note."""
    predictions = [
        {
            "model": "Text Model",
            "label": "POSITIVE",
            "confidence": 92.0,
            "task": "sentiment",
        },
        {
            "model": "Voice Model",
            "label": "NEGATIVE",
            "confidence": 78.0,
            "task": "sentiment",
        },
    ]
    result = fuse_predictions(predictions)
    assert len(result["mismatches"]) == 1
    mismatch = result["mismatches"][0]
    assert mismatch["task"] == "sentiment"
    assert set(mismatch["labels"]) == {"POSITIVE", "NEGATIVE"}
    assert set(mismatch["models"]) == {"Text Model", "Voice Model"}
    assert "not evidence of deception" in mismatch["message"]
    assert result["message"] == "Possible mismatches detected."

    # Verify winning label by weighted score: 92 > 78 -> POSITIVE
    sentiment_fusion = result["fusion_results"]["sentiment"]
    assert sentiment_fusion["label"] == "POSITIVE"
    expected_confidence = round((92.0 / (92.0 + 78.0)) * 100, 2)
    assert sentiment_fusion["confidence"] == expected_confidence


def test_fuse_predictions_multimodal_multi_task():
    """Verify late fusion across different tasks correctly segregates tasks and flags only conflicting ones."""
    predictions = [
        {
            "model": "Text Model",
            "label": "POSITIVE",
            "confidence": 90.0,
            "task": "sentiment",
        },
        {
            "model": "Image Model",
            "label": "GOLDEN RETRIEVER",
            "confidence": 96.4,
            "task": "image_classification",
        },
        {
            "model": "Voice Model",
            "label": "NEGATIVE",
            "confidence": 80.0,
            "task": "sentiment",
        },
    ]
    result = fuse_predictions(predictions)
    assert len(result["models"]) == 3
    assert "sentiment" in result["fusion_results"]
    assert "image_classification" in result["fusion_results"]

    # Image classification has 1 model, no conflict
    assert result["fusion_results"]["image_classification"]["label"] == "GOLDEN RETRIEVER"
    assert result["fusion_results"]["image_classification"]["confidence"] == 100.0

    # Only sentiment has conflict
    assert len(result["mismatches"]) == 1
    assert result["mismatches"][0]["task"] == "sentiment"


def test_fuse_predictions_zero_confidence():
    """Verify zero total confidence handles division safely."""
    predictions = [
        {
            "model": "Text Model",
            "label": "POSITIVE",
            "confidence": 0.0,
            "task": "sentiment",
        }
    ]
    result = fuse_predictions(predictions)
    assert result["fusion_results"]["sentiment"]["label"] is None
    assert result["fusion_results"]["sentiment"]["confidence"] is None
    assert result["fusion_results"]["sentiment"]["message"] == "All confidence scores are zero."


def test_text_model_and_analyze_text():
    """Verify text model analyzes input and returns label, confidence, and task."""
    model = TextModel()
    pos_res = model.predict("I am very happy and delighted with the progress!")
    assert pos_res["model"] == "Text Model"
    assert pos_res["label"] == "POSITIVE"
    assert 0 <= pos_res["confidence"] <= 100
    assert pos_res["task"] == "sentiment"

    neg_res = analyze_text("This is terrible, awful and unacceptable.")
    assert neg_res["label"] == "NEGATIVE"
    assert neg_res["task"] == "sentiment"

    empty_res = analyze_text("")
    assert empty_res["label"] == "UNKNOWN"
    assert empty_res["confidence"] == 0.0


def test_image_model_and_analyze_image():
    """Verify image model analyzes PIL image and returns label, confidence, and task."""
    model = ImageModel()
    pil_image = Image.new("RGB", (64, 64), color="green")
    res = model.predict(pil_image)
    assert res["model"] == "Image Model"
    assert res["task"] == "image_classification"
    assert 0 <= res["confidence"] <= 100
    assert isinstance(res["label"], str)

    none_res = analyze_image(None)
    assert none_res["label"] == "UNKNOWN"
    assert none_res["confidence"] == 0.0


def test_voice_model_and_analyze_voice(tmp_path):
    """Verify voice model analyzes audio path and returns label, confidence, task, and transcription."""
    model = VoiceModel()
    sample_wav = tmp_path / "happy_feedback.wav"
    sample_wav.write_bytes(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00")

    res = model.predict(str(sample_wav))
    assert res["model"] == "Voice Model"
    assert res["task"] == "sentiment"
    assert 0 <= res["confidence"] <= 100
    assert res["label"] == "POSITIVE"
    assert "optimistic" in res["transcription"].lower() or "progress" in res["transcription"].lower()

    empty_res = analyze_voice("")
    assert empty_res["label"] == "UNKNOWN"
    assert empty_res["confidence"] == 0.0


def test_end_to_end_multimodal_analysis_and_fusion(tmp_path):
    """Verify connecting text, image, and voice models, returning each model's label and confidence,
    combining available results, and flagging possible mismatches."""
    # 1. Analyze text (Positive wording)
    text_result = analyze_text("Thank you so much! Everything turned out wonderful and great.")
    assert text_result["label"] == "POSITIVE"
    assert text_result["confidence"] > 0
    assert text_result["task"] == "sentiment"

    # 2. Analyze image
    img = Image.new("RGB", (128, 128), color="red")
    image_result = analyze_image(img)
    assert image_result["label"] != "ERROR"
    assert image_result["confidence"] > 0
    assert image_result["task"] == "image_classification"

    # 3. Analyze voice (Concerned voice cues)
    audio_path = tmp_path / "urgent_concerned_update.wav"
    audio_path.write_bytes(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00")
    voice_result = analyze_voice(str(audio_path))
    assert voice_result["label"] == "NEGATIVE"
    assert voice_result["confidence"] > 0
    assert voice_result["task"] == "sentiment"

    # 4. Combine available results via late fusion
    fused = fuse_predictions([text_result, image_result, voice_result])

    # 5. Check each model's label and confidence is returned
    assert len(fused["models"]) == 3
    model_names = [m["model"] for m in fused["models"]]
    assert "Text Model" in model_names
    assert "Image Model" in model_names
    assert "Voice Model" in model_names

    # 6. Check fusion results
    assert "sentiment" in fused["fusion_results"]
    assert "image_classification" in fused["fusion_results"]

    # 7. Check mismatch detected between text (POSITIVE) and voice (NEGATIVE)
    assert len(fused["mismatches"]) == 1
    mismatch = fused["mismatches"][0]
    assert mismatch["task"] == "sentiment"
    assert "Text Model" in mismatch["models"]
    assert "Voice Model" in mismatch["models"]
