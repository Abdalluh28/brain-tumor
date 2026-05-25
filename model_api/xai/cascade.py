from __future__ import annotations

from ..pipeline import PipelineResult, STAGE2_LABELS
from ..schemas import Prediction


def resolve_cascade_xai_stage(prediction: Prediction) -> int:
    """
    Pick the cascade stage whose decision produced the final label.

    Healthy -> stage 1
    Metastasis / Others -> stage 2
    HGG / LGG -> stage 3
    """
    if prediction == "Healthy":
        return 1
    if prediction in ("Metastasis", "Others"):
        return 2
    if prediction in ("HGG", "LGG"):
        return 3
    raise ValueError(f"No cascade XAI mapping for prediction: {prediction}")


def resolve_cascade_target_class_index(
    prediction: Prediction,
    pipeline_result: PipelineResult,
) -> int:
    """Class index within the resolved stage model for the cascade decision."""
    stage = resolve_cascade_xai_stage(prediction)
    stage_key = f"stage{stage}"
    detail = pipeline_result.stage_details.get(stage_key)

    if detail is None:
        raise ValueError(f"Missing pipeline detail for {stage_key}")

    if stage == 1:
        return 0 if detail.label == "Healthy" else 1

    if stage == 2:
        return STAGE2_LABELS.index(detail.label)

    if stage == 3:
        return 0 if detail.label == "HGG" else 1

    raise ValueError(f"Unsupported stage for cascade XAI: {stage}")


def resolve_cascade_target_from_prediction(prediction: Prediction) -> tuple[int, int]:
    """Return (stage, class_index) from final cascade label only (no pipeline re-run)."""
    stage = resolve_cascade_xai_stage(prediction)

    if stage == 1:
        return stage, 0

    if stage == 2:
        if prediction == "Metastasis":
            return stage, 1
        if prediction == "Others":
            return stage, 2
        return stage, 0

    return stage, 0 if prediction == "HGG" else 1
