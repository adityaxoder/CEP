from transformers import pipeline


class VoiceModel:
    def __init__(self):
        self.transcriber = pipeline(
            "automatic-speech-recognition",
            model="openai/whisper-tiny"
        )

        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
        )

    def predict(self, audio_path):
        try:
            transcription_result = self.transcriber(audio_path)

            transcription = transcription_result.get(
                "text", ""
            ).strip()

            if not transcription:
                return {
                    "model": "Voice Model",
                    "label": "UNKNOWN",
                    "confidence": 0.0,
                    "transcription": "",
                    "error": "No speech detected"
                }

            sentiment_result = self.sentiment_analyzer(
                transcription[:2000]
            )[0]

            return {
                "model": "Voice Model",
                "label": sentiment_result["label"].upper(),
                "confidence": round(
                    float(sentiment_result["score"]), 4
                ),
                "transcription": transcription
            }

        except Exception as e:
            return {
                "model": "Voice Model",
                "label": "ERROR",
                "confidence": 0.0,
                "error": str(e)
            }