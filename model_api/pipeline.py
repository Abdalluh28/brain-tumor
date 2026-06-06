from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

import keras
import numpy as np

from .config import (
    MODEL_VERSION,
    STAGE1_MODALITIES,
    STAGE1_MODEL_PATH,
    STAGE2_MODEL_PATH,
    STAGE3_MODEL_PATH,
)
from .stage2_loader import load_stage2_model
from .inference import keras_predict_batch_proba, keras_predict_proba
from .tf_device import configure_tensorflow
from .scan_inputs import PreparedScanInputs
from .schemas import Prediction, ScanFileIn

STAGE1_LABELS = ("Healthy", "Tumor")
STAGE2_LABELS = ("GLI", "METS", "OTHER")
STAGE3_LABELS = ("HGG", "LGG")

CasePrediction = Literal["GLI", "METS", "OTHER", "Healthy"]

FINAL_LABELS: tuple[Prediction, ...] = (
    "Healthy",
    "Metastasis",
    "Others",
    "HGG",
    "LGG",
)


@dataclass(frozen=True)
class StagePrediction:
    label: str
    confidence: float
    probabilities: dict[str, float]


@dataclass(frozen=True)
class PipelineResult:
    prediction: Prediction
    confidence: float
    confidence_scores: dict[Prediction, float]
    stages_run: list[str]
    stage_details: dict[str, StagePrediction]
    slice_filter: dict | None = None


def _softmax_dict(labels: tuple[str, ...], probs: np.ndarray) -> dict[str, float]:
    return {label: float(prob) for label, prob in zip(labels, probs, strict=True)}


def _predict_stage(model, tensor: np.ndarray) -> tuple[int, np.ndarray]:
    probs = keras_predict_proba(model, tensor)
    return int(np.argmax(probs)), probs


@lru_cache(maxsize=1)
def _load_models() -> tuple:
    keras.config.enable_unsafe_deserialization()

    for path in (STAGE1_MODEL_PATH, STAGE2_MODEL_PATH, STAGE3_MODEL_PATH):
        if not path.exists():
            raise FileNotFoundError(f"Model file not found: {path}")

    stage1 = keras.models.load_model(STAGE1_MODEL_PATH, compile=False)
    stage2 = load_stage2_model()
    stage3 = keras.models.load_model(STAGE3_MODEL_PATH, compile=False)
    return stage1, stage2, stage3


def _finalize_scores(joint_probs: dict[Prediction, float]) -> dict[Prediction, float]:
    total = sum(joint_probs.values())
    if total <= 0:
        raise RuntimeError("Pipeline produced empty probability mass.")

    percentages = {
        label: round((value / total) * 100, 2)
        for label, value in joint_probs.items()
    }
    delta = round(100 - sum(percentages.values()), 2)
    top_label = max(percentages, key=percentages.get)
    percentages[top_label] = round(percentages[top_label] + delta, 2)
    return percentages


def run_pipeline(
    files: list[ScanFileIn],
    *,
    prepared: PreparedScanInputs | None = None,
) -> PipelineResult:
    configure_tensorflow()

    if prepared is None:
        from .scan_inputs import prepare_scan_inputs

        prepared = prepare_scan_inputs(files)

    stage1_model, stage2_model, stage3_model = _load_models()

    stage_details: dict[str, StagePrediction] = {}
    stages_run: list[str] = ["stage1"]

    stage1_tensor = prepared.stage1_tensor
    stage1_idx, stage1_probs = _predict_stage(stage1_model, stage1_tensor)
    stage1_pred = StagePrediction(
        label=STAGE1_LABELS[stage1_idx],
        confidence=float(stage1_probs[stage1_idx]),
        probabilities=_softmax_dict(STAGE1_LABELS, stage1_probs),
    )
    stage_details["stage1"] = stage1_pred

    p_healthy = stage1_pred.probabilities["Healthy"]
    p_tumor = stage1_pred.probabilities["Tumor"]

    if stage1_idx == 0:
        joint_probs: dict[Prediction, float] = {
            "Healthy": p_healthy,
            "Metastasis": 0.0,
            "Others": 0.0,
            "HGG": 0.0,
            "LGG": 0.0,
        }
        confidence_scores = _finalize_scores(joint_probs)
        return PipelineResult(
            prediction="Healthy",
            confidence=confidence_scores["Healthy"],
            confidence_scores=confidence_scores,
            stages_run=stages_run,
            stage_details=stage_details,
            slice_filter=prepared.slice_filter,
        )

    stage4_tensor = prepared.stage4_tensor
    stages_run.append("stage2")
    stage2_idx, stage2_probs = _predict_stage(stage2_model, stage4_tensor)
    stage2_pred = StagePrediction(
        label=STAGE2_LABELS[stage2_idx],
        confidence=float(stage2_probs[stage2_idx]),
        probabilities=_softmax_dict(STAGE2_LABELS, stage2_probs),
    )
    stage_details["stage2"] = stage2_pred

    p_gli = p_tumor * stage2_pred.probabilities["GLI"]
    p_mets = p_tumor * stage2_pred.probabilities["METS"]
    p_other = p_tumor * stage2_pred.probabilities["OTHER"]

    if stage2_idx == 1:
        joint_probs = {
            "Healthy": p_healthy,
            "Metastasis": p_mets,
            "Others": p_other,
            "HGG": 0.0,
            "LGG": 0.0,
        }
        confidence_scores = _finalize_scores(joint_probs)
        return PipelineResult(
            prediction="Metastasis",
            confidence=confidence_scores["Metastasis"],
            confidence_scores=confidence_scores,
            stages_run=stages_run,
            stage_details=stage_details,
            slice_filter=prepared.slice_filter,
        )

    if stage2_idx == 2:
        joint_probs = {
            "Healthy": p_healthy,
            "Metastasis": p_mets,
            "Others": p_other,
            "HGG": 0.0,
            "LGG": 0.0,
        }
        confidence_scores = _finalize_scores(joint_probs)
        return PipelineResult(
            prediction="Others",
            confidence=confidence_scores["Others"],
            confidence_scores=confidence_scores,
            stages_run=stages_run,
            stage_details=stage_details,
            slice_filter=prepared.slice_filter,
        )

    stages_run.append("stage3")
    stage3_idx, stage3_probs = _predict_stage(stage3_model, stage4_tensor)
    stage3_pred = StagePrediction(
        label=STAGE3_LABELS[stage3_idx],
        confidence=float(stage3_probs[stage3_idx]),
        probabilities=_softmax_dict(STAGE3_LABELS, stage3_probs),
    )
    stage_details["stage3"] = stage3_pred

    p_hgg = p_gli * stage3_pred.probabilities["HGG"]
    p_lgg = p_gli * stage3_pred.probabilities["LGG"]

    joint_probs = {
        "Healthy": p_healthy,
        "Metastasis": p_mets,
        "Others": p_other,
        "HGG": p_hgg,
        "LGG": p_lgg,
    }
    confidence_scores = _finalize_scores(joint_probs)
    prediction: Prediction = "HGG" if stage3_idx == 0 else "LGG"

    return PipelineResult(
        prediction=prediction,
        confidence=confidence_scores[prediction],
        confidence_scores=confidence_scores,
        stages_run=stages_run,
        stage_details=stage_details,
        slice_filter=prepared.slice_filter,
    )


def get_model_version() -> str:
    return MODEL_VERSION


def prediction_to_case_label(prediction: Prediction) -> CasePrediction:
    if prediction in ("HGG", "LGG"):
        return "GLI"
    if prediction == "Metastasis":
        return "METS"
    if prediction == "Others":
        return "OTHER"
    return "Healthy"


@dataclass(frozen=True)
class SliceCascadeResult:
    z: int
    prediction: Prediction
    confidence: float
    case_label: CasePrediction
    stages_run: list[str]
    stage_details: dict[str, StagePrediction]


def _slice_stage_prediction(
    labels: tuple[str, ...], probs: np.ndarray
) -> StagePrediction:
    idx = int(np.argmax(probs))
    return StagePrediction(
        label=labels[idx],
        confidence=round(float(probs[idx]) * 100, 2),
        probabilities=_softmax_dict(labels, probs),
    )


def _finalize_slice_prediction(
    stage_details: dict[str, StagePrediction],
    stages_run: list[str],
) -> tuple[Prediction, float]:
    if stage_details["stage1"].label == "Healthy":
        return "Healthy", stage_details["stage1"].confidence

    stage2 = stage_details["stage2"]
    if stage2.label == "METS":
        return "Metastasis", stage2.confidence
    if stage2.label == "OTHER":
        return "Others", stage2.confidence

    stage3 = stage_details["stage3"]
    prediction: Prediction = "HGG" if stage3.label == "HGG" else "LGG"
    return prediction, stage3.confidence


def run_per_slice_cascade(prepared: PreparedScanInputs) -> list[SliceCascadeResult]:
    """Run the hierarchical cascade independently on each valid slice."""
    configure_tensorflow()
    stage1_model, stage2_model, stage3_model = _load_models()

    good_slices = list(prepared.slice_filter["good_slices"])
    stage1_probs = keras_predict_batch_proba(stage1_model, prepared.stage1_tensor)
    stage4_tensor = prepared.stage4_tensor

    slice_results: list[SliceCascadeResult] = []

    tumor_indices = [i for i, probs in enumerate(stage1_probs) if int(np.argmax(probs)) == 1]
    stage2_probs_map: dict[int, np.ndarray] = {}
    stage3_probs_map: dict[int, np.ndarray] = {}

    if tumor_indices:
        tumor_batch = stage4_tensor[tumor_indices]
        tumor_stage2_probs = keras_predict_batch_proba(stage2_model, tumor_batch)
        for local_i, global_i in enumerate(tumor_indices):
            stage2_probs_map[global_i] = tumor_stage2_probs[local_i]

        gli_indices = [
            global_i
            for global_i in tumor_indices
            if int(np.argmax(stage2_probs_map[global_i])) == 0
        ]
        if gli_indices:
            gli_batch = stage4_tensor[gli_indices]
            gli_stage3_probs = keras_predict_batch_proba(stage3_model, gli_batch)
            for local_i, global_i in enumerate(gli_indices):
                stage3_probs_map[global_i] = gli_stage3_probs[local_i]

    for i, z in enumerate(good_slices):
        stage_details: dict[str, StagePrediction] = {}
        stages_run: list[str] = ["stage1"]
        stage_details["stage1"] = _slice_stage_prediction(STAGE1_LABELS, stage1_probs[i])

        if stage_details["stage1"].label == "Healthy":
            prediction, confidence = _finalize_slice_prediction(stage_details, stages_run)
            slice_results.append(
                SliceCascadeResult(
                    z=int(z),
                    prediction=prediction,
                    confidence=confidence,
                    case_label=prediction_to_case_label(prediction),
                    stages_run=stages_run,
                    stage_details=stage_details,
                )
            )
            continue

        stages_run.append("stage2")
        stage_details["stage2"] = _slice_stage_prediction(
            STAGE2_LABELS, stage2_probs_map[i]
        )

        if stage_details["stage2"].label in ("METS", "OTHER"):
            prediction, confidence = _finalize_slice_prediction(stage_details, stages_run)
            slice_results.append(
                SliceCascadeResult(
                    z=int(z),
                    prediction=prediction,
                    confidence=confidence,
                    case_label=prediction_to_case_label(prediction),
                    stages_run=stages_run,
                    stage_details=stage_details,
                )
            )
            continue

        stages_run.append("stage3")
        stage_details["stage3"] = _slice_stage_prediction(
            STAGE3_LABELS, stage3_probs_map[i]
        )
        prediction, confidence = _finalize_slice_prediction(stage_details, stages_run)
        slice_results.append(
            SliceCascadeResult(
                z=int(z),
                prediction=prediction,
                confidence=confidence,
                case_label=prediction_to_case_label(prediction),
                stages_run=stages_run,
                stage_details=stage_details,
            )
        )

    return slice_results


def aggregate_slice_predictions(
    slice_results: list[SliceCascadeResult],
) -> tuple[CasePrediction, Prediction, float, dict[Prediction, float], PipelineResult]:
    """
    Majority vote on case labels, then pick the detailed prediction with the most slices.

    ``average_confidence`` is the mean per-slice softmax confidence (0–100) for slices
    matching the winning case label. Case-level ``confidence_scores[prediction]`` is the
    vote share for the winning detailed class and is what the UI should show as confidence.
    """
    if not slice_results:
        raise RuntimeError("No slice predictions to aggregate.")

    case_votes = Counter(result.case_label for result in slice_results)
    case_prediction = case_votes.most_common(1)[0][0]

    matching = [r for r in slice_results if r.case_label == case_prediction]
    detail_votes = Counter(r.prediction for r in matching)
    prediction = detail_votes.most_common(1)[0][0]

    average_confidence = round(
        float(np.mean([r.confidence for r in matching])),
        2,
    )

    vote_counts = Counter(r.prediction for r in slice_results)
    total = len(slice_results)
    raw_scores = {
        label: (vote_counts.get(label, 0) / total) * 100
        for label in FINAL_LABELS
    }
    confidence_scores = _finalize_scores(raw_scores)

    representative = max(matching, key=lambda r: r.confidence)
    merged_stage_details = representative.stage_details
    stages_run = representative.stages_run

    pipeline_result = PipelineResult(
        prediction=prediction,
        confidence=confidence_scores[prediction],
        confidence_scores=confidence_scores,
        stages_run=stages_run,
        stage_details=merged_stage_details,
    )

    return case_prediction, prediction, average_confidence, confidence_scores, pipeline_result
