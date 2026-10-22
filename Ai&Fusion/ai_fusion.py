
from collections import defaultdict


def fuse_predictions(predictions):
    """
    Combine predictions from text, image, and voice models.

    Each prediction should contain:
    {
        "model": "Text Model",
        "label": "POSITIVE",
        "confidence": 95.0,
        "task": "sentiment"
    }

    Confidence must be between 0 and 100.
    """

    valid_predictions = []

    # ---------------------------------------------
    # 1. VALIDATE MODEL PREDICTIONS
    # ---------------------------------------------

    for item in predictions:

        if not isinstance(item, dict):
            continue

        label = item.get("label")
        confidence = item.get("confidence")
        task = item.get("task")

        if (
            isinstance(label, str)
            and label.strip()
            and isinstance(confidence, (int, float))
            and not isinstance(confidence, bool)
            and 0 <= confidence <= 100
            and isinstance(task, str)
            and task.strip()
        ):

            valid_predictions.append({
                "model": item.get("model", "Unknown Model"),
                "label": label.strip(),
                "confidence": float(confidence),
                "task": task.strip()
            })

    # ---------------------------------------------
    # 2. HANDLE MISSING PREDICTIONS
    # ---------------------------------------------

    if not valid_predictions:

        return {
            "models": [],
            "fusion_results": {},
            "mismatches": [],
            "message": "No valid predictions available."
        }

    # ---------------------------------------------
    # 3. GROUP MODELS BY TASK
    # ---------------------------------------------

    task_groups = defaultdict(list)

    for item in valid_predictions:
        task_groups[item["task"]].append(item)

    fusion_results = {}
    mismatches = []

    # ---------------------------------------------
    # 4. FUSE COMPATIBLE PREDICTIONS
    # ---------------------------------------------

    for task, items in task_groups.items():

        scores = defaultdict(float)

        for item in items:

            label = item["label"]
            confidence = item["confidence"]

            scores[label] += confidence

        total_score = sum(scores.values())

        # Handle zero-confidence predictions.
        if total_score == 0:

            fusion_results[task] = {
                "label": None,
                "confidence": None,
                "models_available": len(items),
                "message": "All confidence scores are zero."
            }

        else:

            # Select the label with the highest combined score.
            winning_label = max(
                scores,
                key=scores.get
            )

            # Normalized voting score, not a calibrated probability.
            fusion_confidence = (
                scores[winning_label] / total_score
            ) * 100

            fusion_results[task] = {
                "label": winning_label,
                "confidence": round(fusion_confidence, 2),
                "models_available": len(items)
            }

        # -----------------------------------------
        # 5. DETECT MISMATCHES
        # -----------------------------------------

        labels = {
            item["label"].casefold()
            for item in items
        }

        if len(items) > 1 and len(labels) > 1:

            mismatches.append({
                "task": task,
                "labels": [
                    item["label"]
                    for item in items
                ],
                "models": [
                    item["model"]
                    for item in items
                ],
                "message": (
                    f"Possible mismatch detected in {task}: "
                    "the models disagree on their predictions."
                )
            })

    # ---------------------------------------------
    # 6. FORMAT INDIVIDUAL MODEL RESULTS
    # ---------------------------------------------

    model_results = []

    for item in valid_predictions:

        model_results.append({
            "model": item["model"],
            "label": item["label"],
            "confidence": round(item["confidence"], 2),
            "task": item["task"]
        })

    # ---------------------------------------------
    # 7. RETURN COMPLETE RESULTS
    # ---------------------------------------------

    return {
        "models": model_results,
        "fusion_results": fusion_results,
        "mismatches": mismatches,
        "message": (
            "Possible mismatches detected."
            if mismatches
            else "No disagreements detected between comparable models."
        )
    }


# =================================================
# TEST THE FUSION MODULE
# =================================================

if __name__ == "__main__":

    import json

    sample_predictions = [

        {
            "model": "Text Model",
            "label": "POSITIVE",
            "confidence": 92.0,
            "task": "sentiment"
        },

        {
            "model": "Image Model",
            "label": "golden retriever",
            "confidence": 96.4,
            "task": "object_classification"
        },

        {
            "model": "Voice Model",
            "label": "NEGATIVE",
            "confidence": 78.0,
            "task": "sentiment"
        }

    ]

    result = fuse_predictions(sample_predictions)

    print("\n========== AI FUSION RESULTS ==========\n")

    print(
        json.dumps(
            result,
            indent=4
        )
    )
```
