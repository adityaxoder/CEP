from transformers import pipeline


class TextModel:
    def __init__(self):
        self.classifier = pipeline(
            "sentiment-analysis",
            model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
        )

    def predict(self, text):
        if not text or not text.strip():
            return {
                "model": "Text Model",
                "label": "UNKNOWN",
                "confidence": 0.0,
                "error": "No text provided"
            }

        try:
            result = self.classifier(text[:2000])[0]

            return {
                "model": "Text Model",
                "label": result["label"].upper(),
                "confidence": round(float(result["score"]), 4)
            }

        except Exception as e:
            return {
                "model": "Text Model",
                "label": "ERROR",
                "confidence": 0.0,
                "error": str(e)
            }