# EmotionIQ — Offline Rule-Based Demo Scope

The classroom demo is planned to run locally without an external API, API key, model download, or paid account. This document records the planned behavior; it does not claim that the changes have already been implemented or verified.

| Input/feature | Planned local operation | User-facing result |
|---|---|---|
| Text | Match input against small, documented positive/concern/frustration word lists. | Rule-based wording cue with the matched words; **Mixed** or **No clear cue** where appropriate. |
| Image | Decode with the existing image library and calculate dimensions, brightness, and contrast. | Observable image properties. No automated face or mood label. Optional sample notes must be identified as human-written annotations. |
| Audio | Support PCM WAV and compute simple loudness and loudness variation from the actual samples. | Sound-level/delivery cues only. No speech transcript or emotion/mood prediction. |
| Coach | Apply a deterministic template for the selected style. | Suggested rewrite labeled as template-based; user reviews meaning. |
| Combined | Display each modality's available result separately. | No unified mood or cross-modal agreement claim. |

Image brightness/contrast and audio loudness cannot establish a person's internal emotional state. Text word matching cannot reliably handle context, sarcasm, or mixed meaning. Every screen and demo explanation must call these **rule-based cues**, never AI or model predictions.

The backend keeps input data in memory only for the request. The UI may keep structured results in session history; raw text, images, and recordings are not persisted. No external processing consent is needed for local-only operation, but the UI should still explain what is measured and the limits.

Implementation tasks and launch commands are tracked in [Vedant_All.md](../Vedant_All.md). The current code still needs the planned changes, including removal of filename-based image/audio outputs; this scope is not an implementation-complete claim.
