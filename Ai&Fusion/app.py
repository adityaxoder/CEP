
import json
import os
import tempfile

import streamlit as st

from text_model import analyze_text
from image_model import analyze_image
from voice_model import analyze_voice
from ai_fusion import fuse_predictions


# --------------------------------------------------
# PAGE CONFIGURATION
# --------------------------------------------------

st.set_page_config(
    page_title="AI & Fusion",
    page_icon="🤖",
    layout="wide"
)

st.title("🤖 AI & Fusion")
st.subheader("Multimodal AI Analysis System")

st.write(
    "Connect text, image, and voice models, display their "
    "predictions and confidence scores, combine available "
    "results, and detect possible mismatches."
)


# --------------------------------------------------
# SESSION STATE
# --------------------------------------------------

if "text_result" not in st.session_state:
    st.session_state.text_result = None

if "image_result" not in st.session_state:
    st.session_state.image_result = None

if "voice_result" not in st.session_state:
    st.session_state.voice_result = None

if "fusion_result" not in st.session_state:
    st.session_state.fusion_result = None


# --------------------------------------------------
# TEXT ANALYSIS
# --------------------------------------------------

st.divider()
st.header("1. Text Model")

text_input = st.text_area(
    "Enter text for analysis",
    placeholder="Example: I am very happy today.",
    height=120
)

if st.button("Analyze Text", key="analyze_text"):

    if not text_input.strip():
        st.warning("Please enter some text.")

    else:
        try:
            with st.spinner("Analyzing text..."):
                result = analyze_text(text_input)

            st.session_state.text_result = result
            st.session_state.fusion_result = None

            st.success("Text analysis completed.")

        except Exception as error:
            st.error(f"Text analysis failed: {error}")


if st.session_state.text_result:
    result = st.session_state.text_result

    col1, col2 = st.columns(2)

    with col1:
        st.metric("Text Prediction", result["label"])

    with col2:
        st.metric(
            "Confidence",
            f"{result['confidence']:.2f}%"
        )


# --------------------------------------------------
# IMAGE ANALYSIS
# --------------------------------------------------

st.divider()
st.header("2. Image Model")

uploaded_image = st.file_uploader(
    "Upload an image",
    type=["jpg", "jpeg", "png"],
    key="image_upload"
)

if uploaded_image is not None:

    st.image(
        uploaded_image,
        caption="Uploaded Image",
        use_container_width=True
    )

    if st.button("Analyze Image", key="analyze_image"):

        temp_path = None

        try:
            suffix = os.path.splitext(
                uploaded_image.name
            )[1]

            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=suffix
            ) as temp_file:

                temp_file.write(
                    uploaded_image.getvalue()
                )

                temp_path = temp_file.name

            with st.spinner("Analyzing image..."):
                result = analyze_image(temp_path)

            st.session_state.image_result = result
            st.session_state.fusion_result = None

            st.success("Image analysis completed.")

        except Exception as error:
            st.error(f"Image analysis failed: {error}")

        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)


if st.session_state.image_result:
    result = st.session_state.image_result

    col1, col2 = st.columns(2)

    with col1:
        st.metric("Image Prediction", result["label"])

    with col2:
        st.metric(
            "Confidence",
            f"{result['confidence']:.2f}%"
        )


# --------------------------------------------------
# VOICE ANALYSIS
# --------------------------------------------------

st.divider()
st.header("3. Voice Model")

uploaded_audio = st.file_uploader(
    "Upload an audio recording",
    type=["wav", "mp3", "m4a", "flac"],
    key="audio_upload"
)

if uploaded_audio is not None:

    st.audio(uploaded_audio)

    if st.button("Analyze Voice", key="analyze_voice"):

        temp_path = None

        try:
            suffix = os.path.splitext(
                uploaded_audio.name
            )[1]

            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=suffix
            ) as temp_file:

                temp_file.write(
                    uploaded_audio.getvalue()
                )

                temp_path = temp_file.name

            with st.spinner(
                "Transcribing and analyzing voice..."
            ):
                result = analyze_voice(temp_path)

            st.session_state.voice_result = result
            st.session_state.fusion_result = None

            st.success("Voice analysis completed.")

        except Exception as error:
            st.error(f"Voice analysis failed: {error}")

        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)


if st.session_state.voice_result:
    result = st.session_state.voice_result

    st.write("**Transcription:**")
    st.write(result.get("transcription", "Not available"))

    col1, col2 = st.columns(2)

    with col1:
        st.metric("Voice Sentiment", result["label"])

    with col2:
        st.metric(
            "Confidence",
            f"{result['confidence']:.2f}%"
        )


# --------------------------------------------------
# AI FUSION
# --------------------------------------------------

st.divider()
st.header("4. AI Fusion")

st.write(
    "Combine predictions from the models that have "
    "successfully completed their analysis."
)

if st.button("Combine Available Results"):

    predictions = []

    if st.session_state.text_result:
        predictions.append(
            st.session_state.text_result
        )

    if st.session_state.image_result:
        predictions.append(
            st.session_state.image_result
        )

    if st.session_state.voice_result:
        predictions.append(
            st.session_state.voice_result
        )

    if not predictions:

        st.warning(
            "Run at least one model before combining results."
        )

    else:

        try:
            result = fuse_predictions(predictions)

            st.session_state.fusion_result = result

        except Exception as error:
            st.error(f"Fusion failed: {error}")


# --------------------------------------------------
# DISPLAY FUSION RESULTS
# --------------------------------------------------

fusion_result = st.session_state.fusion_result

if fusion_result:

    st.subheader("Individual Model Results")

    if fusion_result.get("models"):

        st.dataframe(
            [
                {
                    "Model": item["model"],
                    "Task": item["task"],
                    "Prediction": item["label"],
                    "Confidence (%)": item["confidence"]
                }
                for item in fusion_result["models"]
            ],
            use_container_width=True,
            hide_index=True
        )

    st.subheader("Combined Predictions")

    fusion_results = fusion_result.get(
        "fusion_results", {}
    )

    if fusion_results:

        for task, result in fusion_results.items():

            st.markdown(f"### {task.replace('_', ' ').title()}")

            col1, col2 = st.columns(2)

            with col1:
                st.metric(
                    "Combined Prediction",
                    result.get("label") or "Unavailable"
                )

            with col2:
                confidence = result.get("confidence")

                st.metric(
                    "Normalized Voting Score",
                    (
                        f"{confidence:.2f}%"
                        if confidence is not None
                        else "Unavailable"
                    )
                )

    st.subheader("Mismatch Detection")

    mismatches = fusion_result.get("mismatches", [])

    if mismatches:

        st.warning("Possible mismatches detected.")

        for mismatch in mismatches:

            st.write(
                f"**Task:** {mismatch['task']}"
            )

            st.write(mismatch["message"])

            st.write(
                "Conflicting labels: "
                + ", ".join(mismatch["labels"])
            )

    else:

        st.success(
            "No disagreements detected between comparable models."
        )

    st.subheader("Complete JSON Output")

    st.json(fusion_result)

    st.download_button(
        label="Download Results as JSON",
        data=json.dumps(
            fusion_result,
            indent=4
        ),
        file_name="ai_fusion_results.json",
        mime="application/json"
    )


# --------------------------------------------------
# RESET
# --------------------------------------------------

st.divider()

if st.button("Reset All Results"):

    st.session_state.text_result = None
    st.session_state.image_result = None
    st.session_state.voice_result = None
    st.session_state.fusion_result = None

    st.rerun()


# --------------------------------------------------
# FOOTER
# --------------------------------------------------

st.divider()

st.caption(
    "AI & Fusion | Text Analysis | Image Analysis | "
    "Voice Analysis | Prediction Fusion | Mismatch Detection"
)
```
