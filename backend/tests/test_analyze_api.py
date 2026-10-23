"""Integration and validation tests for POST /analyze."""

import io
import struct
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app


@pytest.fixture
def test_app():
    return create_app(
        Settings(
            app_env="test",
            app_version="test-version",
            text_model_name="baseline",
            allow_dev_baseline=True,
        )
    )



@pytest.fixture
def client(test_app):
    return TestClient(test_app, raise_server_exceptions=False)


def make_test_image(format: str = "PNG") -> bytes:
    """Create a minimal valid image."""
    img = Image.new("RGB", (10, 10), color="blue")
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def make_test_audio() -> bytes:
    """Create a minimal valid WAV audio file."""
    sample_rate = 8000
    num_samples = 160
    data_size = num_samples * 2
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_size, b"WAVE",
        b"fmt ", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16,
        b"data", data_size
    )
    return header + (b"\x00" * data_size)


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------

def test_empty_request_rejected(client: TestClient):
    """Empty request with no signals returns 422 EMPTY_REQUEST."""
    response = client.post("/analyze", data={})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "EMPTY_REQUEST"
    assert "at least one signal" in body["message"].lower()


def test_whitespace_only_text_and_empty_files_rejected(client: TestClient):
    """Whitespace-only text and empty 0-byte files return 422."""
    response = client.post(
        "/analyze",
        data={"text": "   "},
        files={
            "image": ("empty.png", b"", "image/png"),
            "audio": ("empty.wav", b"", "audio/wav"),
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "EMPTY_REQUEST"


def test_text_too_long_rejected(client: TestClient):
    """Text exceeding max_text_length is rejected with 422 TEXT_TOO_LONG."""
    long_text = "a" * 10_001
    response = client.post("/analyze", data={"text": long_text})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "TEXT_TOO_LONG"


def test_image_too_large_rejected(client: TestClient):
    """Image exceeding 5 MB limit is rejected with 413 UPLOAD_TOO_LARGE."""
    oversized = b"X" * (5_242_880 + 10)
    response = client.post(
        "/analyze",
        files={"image": ("large.png", oversized, "image/png")},
    )
    assert response.status_code == 413
    assert response.json()["code"] == "UPLOAD_TOO_LARGE"


def test_image_unsupported_media_type_rejected(client: TestClient):
    """Unsupported image format is rejected with 415 UNSUPPORTED_MEDIA_TYPE."""
    response = client.post(
        "/analyze",
        files={"image": ("file.gif", b"GIF89a...", "image/gif")},
    )
    assert response.status_code == 415
    assert response.json()["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_image_malformed_rejected(client: TestClient):
    """Corrupted image bytes rejected with 422 MALFORMED_IMAGE."""
    response = client.post(
        "/analyze",
        files={"image": ("corrupt.png", b"not-an-image-data-here", "image/png")},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "MALFORMED_IMAGE"


def test_audio_too_large_rejected(client: TestClient):
    """Audio exceeding 10 MB limit is rejected with 413 UPLOAD_TOO_LARGE."""
    oversized = b"X" * (10_485_760 + 10)
    response = client.post(
        "/analyze",
        files={"audio": ("large.wav", oversized, "audio/wav")},
    )
    assert response.status_code == 413
    assert response.json()["code"] == "UPLOAD_TOO_LARGE"


def test_audio_unsupported_media_type_rejected(client: TestClient):
    """Unsupported audio format rejected with 415 UNSUPPORTED_MEDIA_TYPE."""
    response = client.post(
        "/analyze",
        files={"audio": ("song.flac", b"fLaC...", "audio/flac")},
    )
    assert response.status_code == 415
    assert response.json()["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_audio_malformed_signature_rejected(client: TestClient):
    """Corrupted audio signature rejected with 422 MALFORMED_AUDIO."""
    response = client.post(
        "/analyze",
        files={"audio": ("corrupt.wav", b"not-a-wav-header", "audio/wav")},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "MALFORMED_AUDIO"


# ---------------------------------------------------------------------------
# Flow tests (text-only, image-only, audio-only, multimodal)
# ---------------------------------------------------------------------------

def test_text_only_analysis_success(client: TestClient):
    """Text-only analysis returns text modality result and nulls for others."""
    response = client.post("/analyze", data={"text": "I really appreciate your help, thank you!"})
    assert response.status_code == 200
    body = response.json()

    assert "requestId" in body
    assert body["modalities"]["text"] is not None
    assert body["modalities"]["text"]["label"] != ""
    assert 0.0 <= body["modalities"]["text"]["confidence"] <= 1.0
    assert body["modalities"]["image"] is None
    assert body["modalities"]["audio"] is None
    assert body["mismatch"]["detected"] is False
    assert body["summary"] is not None
    assert "word message is estimated" in body["summary"]


def test_image_only_analysis_success(client: TestClient):
    """Image-only analysis returns image modality result and nulls for others."""
    img_bytes = make_test_image()
    response = client.post(
        "/analyze",
        files={"image": ("test.png", img_bytes, "image/png")},
    )
    assert response.status_code == 200
    body = response.json()

    assert body["modalities"]["text"] is None
    assert body["modalities"]["image"] is not None
    assert 0.0 <= body["modalities"]["image"]["confidence"] <= 1.0
    assert body["modalities"]["audio"] is None
    assert body["mismatch"]["detected"] is False
    assert body["summary"] is not None


def test_audio_only_analysis_success(client: TestClient):
    """Audio-only analysis returns audio modality result and nulls for others."""
    audio_bytes = make_test_audio()
    response = client.post(
        "/analyze",
        files={"audio": ("recording.wav", audio_bytes, "audio/wav")},
    )
    assert response.status_code == 200
    body = response.json()

    assert body["modalities"]["text"] is None
    assert body["modalities"]["image"] is None
    assert body["modalities"]["audio"] is not None
    assert 0.0 <= body["modalities"]["audio"]["confidence"] <= 1.0
    assert body["mismatch"]["detected"] is False
    assert body["summary"] is not None


def test_multimodal_analysis_success(client: TestClient):
    """Multimodal analysis processes text, image, and audio together."""
    img_bytes = make_test_image()
    audio_bytes = make_test_audio()

    response = client.post(
        "/analyze",
        data={"text": "Everything looks on track today."},
        files={
            "image": ("happy_face.png", img_bytes, "image/png"),
            "audio": ("steady_tone.wav", audio_bytes, "audio/wav"),
        },
    )
    assert response.status_code == 200
    body = response.json()

    assert body["modalities"]["text"] is not None
    assert body["modalities"]["image"] is not None
    assert body["modalities"]["audio"] is not None
    assert body["summary"] is not None


def test_multimodal_mismatch_detection(client: TestClient):
    """Conflicting cues between modalities triggers observational mismatch notice."""
    img_bytes = make_test_image()

    response = client.post(
        "/analyze",
        data={"text": "I am worried about this serious issue."},
        files={
            "image": ("happy_smiling.png", img_bytes, "image/png"),
        },
    )
    assert response.status_code == 200
    body = response.json()

    assert body["mismatch"]["detected"] is True
    assert "not aligned" in body["mismatch"]["description"]
    assert "not evidence of deception" in body["mismatch"]["description"]
    assert body["suggestion"] is not None
