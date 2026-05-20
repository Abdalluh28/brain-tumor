from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import keras
import numpy as np

from .config import (
    MODEL_VERSION,
    STAGE1_MODALITIES,
    STAGE1_MODEL_PATH,
    STAGE2_MODEL_PATH,
    STAGE3_MODEL_PATH,
)
from .preprocessing import build_multichannel_tensor, map_files_to_modalities
from .schemas import Prediction, ScanFileIn

STAGE1_LABELS = ("Healthy", "Tumor")
STAGE2_LABELS = ("GLI", "METS", "OTHER")
STAGE3_LABELS = ("HGG", "LGG")

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


def _softmax_dict(labels: tuple[str, ...], probs: np.ndarray) -> dict[str, float]:
    return {label: float(prob) for label, prob in zip(labels, probs, strict=True)}


def _predict_stage(model, tensor: np.ndarray) -> tuple[int, np.ndarray]:
    batch = np.expand_dims(tensor, axis=0)
    probs = model.predict(batch, verbose=0)[0]
    return int(np.argmax(probs)), probs


@lru_cache(maxsize=1)
def _load_models() -> tuple:
    keras.config.enable_unsafe_deserialization()

    for path in (STAGE1_MODEL_PATH, STAGE2_MODEL_PATH, STAGE3_MODEL_PATH):
        if not path.exists():
            raise FileNotFoundError(f"Model file not found: {path}")

    stage1 = keras.models.load_model(STAGE1_MODEL_PATH, compile=False)
    stage2 = keras.models.load_model(STAGE2_MODEL_PATH, compile=False)
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


def run_pipeline(files: list[ScanFileIn]) -> PipelineResult:
    modality_map = map_files_to_modalities(files)
    stage1_model, stage2_model, stage3_model = _load_models()

    stage_details: dict[str, StagePrediction] = {}
    stages_run: list[str] = ["stage1"]

    stage1_tensor = build_multichannel_tensor(modality_map, STAGE1_MODALITIES)
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
        prediction: Prediction = "Healthy"
        return PipelineResult(
            prediction=prediction,
            confidence=confidence_scores[prediction],
            confidence_scores=confidence_scores,
            stages_run=stages_run,
            stage_details=stage_details,
        )

    stage4_tensor = build_multichannel_tensor(
        modality_map,
        ["t1n", "t1c", "t2w", "t2f"],
    )
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
    prediction = "HGG" if stage3_idx == 0 else "LGG"

    return PipelineResult(
        prediction=prediction,
        confidence=confidence_scores[prediction],
        confidence_scores=confidence_scores,
        stages_run=stages_run,
        stage_details=stage_details,
    )


def get_model_version() -> str:
    return MODEL_VERSION
