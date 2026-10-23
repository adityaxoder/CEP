"""Compatibility alias for voice_models.py (singular module name)."""

from models.voice_models import VoiceModel, analyze_voice, get_voice_model

__all__ = ["VoiceModel", "analyze_voice", "get_voice_model"]
