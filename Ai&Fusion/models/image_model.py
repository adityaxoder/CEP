"""Compatibility alias for image_models.py (singular module name)."""

from models.image_models import ImageModel, analyze_image, get_image_model

__all__ = ["ImageModel", "analyze_image", "get_image_model"]
