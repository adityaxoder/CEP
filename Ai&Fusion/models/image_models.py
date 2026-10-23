from transformers import pipeline
from PIL import Image


class ImageModel:
    def __init__(self):
        self.classifier = pipeline(
            "image-classification",
            model="google/vit-base-patch16-224"
        )

    def predict(self, image):
        try:
            if isinstance(image, str):
                image = Image.open(image)

            image = image.convert("RGB")

            results = self.classifier(image)

            best_result = results[0]

            return {
                "model": "Image Model",
                "label": best_result["label"].upper(),
                "confidence": round(
                    float(best_result["score"]), 4
                )
            }

        except Exception as e:
            return {
                "model": "Image Model",
                "label": "ERROR",
                "confidence": 0.0,
                "error": str(e)
            }