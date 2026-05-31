from __future__ import annotations

import logging
import uuid
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tensorflow as tf

from .config import (
    ANALYZE_DEFAULT_XAI_METHOD,
    FULL_CASE_MAX_XAI_SLICES,
    MODALITY_ORDER,
    STAGE2_GRADCAM_TARGET_LAYER,
)
from .inference import keras_predict_batch_proba
from .pipeline import (
    FINAL_LABELS,
    STAGE1_LABELS,
    STAGE2_LABELS,
    STAGE3_LABELS,
    _finalize_scores,
    _load_models,
)
from .scan_inputs import PreparedScanInputs, build_slice_tensor
from .schemas import Prediction
from .segmentation import (
    SegmentationArtifacts,
    build_public_upload_url,
    overlay_mask_on_t1n,
    predict_mask,
    prediction_supports_segmentation,
    resolve_segmentation_output_dir,
    segmentation_model_type,
)
from .tf_device import configure_tensorflow
from .xai.base import generate_explanation
from .xai.utils import blend_overlay, extract_display_channel, heatmap_to_rgb, save_png

logger = logging.getLogger(__name__)

CaseCategory = str  # Healthy | GLI | METS | OTHER

CASE_CATEGORIES: tuple[CaseCategory, ...] = ("Healthy", "GLI", "METS", "OTHER")

CASE_TO_PREDICTION: dict[CaseCategory, Prediction] = {
    "Healthy": "Healthy",
    "GLI": "HGG",
    "METS": "Metastasis",
    "OTHER": "Others",
}

FINAL_TO_CASE: dict[str, CaseCategory] = {
    "Healthy": "Healthy",
    "HGG": "GLI",
    "LGG": "GLI",
    "Metastasis": "METS",
    "Others": "OTHER",
}

STAGE2_TO_CASE: dict[str, CaseCategory] = {
    "GLI": "GLI",
    "METS": "METS",
    "OTHER": "OTHER",
}


@dataclass(frozen=True)
class SliceClassification:
    z: int
    final_label: Prediction
    case_category: CaseCategory
    confidence: float
    stage1_label: str
    stage2_label: str | None
    stage3_label: str | None


@dataclass(frozen=True)
class FullCaseClassification:
    case_prediction: CaseCategory
    average_confidence: float
    prediction: Prediction
    confidence: float
    confidence_scores: dict[Prediction, float]
    slice_results: list[SliceClassification]
    num_valid_slices: int


@dataclass(frozen=True)
class TumorSliceArtifact:
    z: int
    slice_number: int
    confidence: float
    original_slice: str
    segmentation: str
    xai: str
    xai_original: str
    xai_heatmap: str


@dataclass(frozen=True)
class FullCaseArtifacts:
    classification: FullCaseClassification
    tumor_slices: list[TumorSliceArtifact]
    num_tumor_slices: int
    segmentation: SegmentationArtifacts | None
    mask_volume_path: str | None
    xai_error: str | None


def _slice_final_label(
    stage1_idx: int,
    stage1_probs: np.ndarray,
    stage2_idx: int | None,
    stage2_probs: np.ndarray | None,
    stage3_idx: int | None,
    stage3_probs: np.ndarray | None,
) -> tuple[Prediction, CaseCategory, float]:
    if stage1_idx == 0:
        conf = float(stage1_probs[0])
        return "Healthy", "Healthy", conf

    assert stage2_idx is not None and stage2_probs is not None
    if stage2_idx == 1:
        return "Metastasis", "METS", float(stage2_probs[1])
    if stage2_idx == 2:
        return "Others", "OTHER", float(stage2_probs[2])

    assert stage3_idx is not None and stage3_probs is not None
    if stage3_idx == 0:
        return "HGG", "GLI", float(stage3_probs[0])
    return "LGG", "GLI", float(stage3_probs[1])


def classify_valid_slices(prepared: PreparedScanInputs) -> FullCaseClassification:
    configure_tensorflow()
    stage1_model, stage2_model, stage3_model = _load_models()

    n = prepared.stage1_tensor.shape[0]
    z_indices = list(prepared.good_slices)

    stage1_probs = keras_predict_batch_proba(stage1_model, prepared.stage1_tensor)
    stage1_preds = np.argmax(stage1_probs, axis=1)

    stage2_probs = np.zeros((n, len(STAGE2_LABELS)), dtype=np.float32)
    stage2_preds = np.full(n, -1, dtype=int)
    tumor_rows = np.where(stage1_preds == 1)[0]
    if tumor_rows.size:
        tumor_stage4 = prepared.stage4_tensor[tumor_rows]
        batch_s2 = keras_predict_batch_proba(stage2_model, tumor_stage4)
        stage2_probs[tumor_rows] = batch_s2
        stage2_preds[tumor_rows] = np.argmax(batch_s2, axis=1)

    stage3_probs = np.zeros((n, len(STAGE3_LABELS)), dtype=np.float32)
    stage3_preds = np.full(n, -1, dtype=int)
    gli_rows = tumor_rows[stage2_preds[tumor_rows] == 0] if tumor_rows.size else np.array([], dtype=int)
    if gli_rows.size:
        gli_stage4 = prepared.stage4_tensor[gli_rows]
        batch_s3 = keras_predict_batch_proba(stage3_model, gli_stage4)
        stage3_probs[gli_rows] = batch_s3
        stage3_preds[gli_rows] = np.argmax(batch_s3, axis=1)

    slice_results: list[SliceClassification] = []
    for i in range(n):
        s2_idx = int(stage2_preds[i]) if stage1_preds[i] == 1 else None
        s3_idx = int(stage3_preds[i]) if s2_idx == 0 else None
        final_label, case_cat, conf = _slice_final_label(
            int(stage1_preds[i]),
            stage1_probs[i],
            s2_idx,
            stage2_probs[i] if s2_idx is not None else None,
            s3_idx,
            stage3_probs[i] if s3_idx is not None else None,
        )
        slice_results.append(
            SliceClassification(
                z=z_indices[i],
                final_label=final_label,
                case_category=case_cat,
                confidence=round(conf * 100, 2),
                stage1_label=STAGE1_LABELS[int(stage1_preds[i])],
                stage2_label=STAGE2_LABELS[s2_idx] if s2_idx is not None else None,
                stage3_label=STAGE3_LABELS[s3_idx] if s3_idx is not None else None,
            )
        )

    vote_counts = Counter(r.case_category for r in slice_results)
    case_prediction = vote_counts.most_common(1)[0][0]

    average_confidence = round(
        float(np.mean([r.confidence for r in slice_results])),
        2,
    )

    prediction, confidence_scores = _derive_case_prediction(
        case_prediction, slice_results
    )
    confidence = confidence_scores[prediction]

    return FullCaseClassification(
        case_prediction=case_prediction,
        average_confidence=average_confidence,
        prediction=prediction,
        confidence=confidence,
        confidence_scores=confidence_scores,
        slice_results=slice_results,
        num_valid_slices=n,
    )


def _derive_case_prediction(
    case_prediction: CaseCategory,
    slice_results: list[SliceClassification],
) -> tuple[Prediction, dict[Prediction, float]]:
    """Map majority case category to stored prediction + score distribution."""
    category_counts = Counter(r.case_category for r in slice_results)
    total = len(slice_results) or 1

    if case_prediction == "Healthy":
        joint = {label: 0.0 for label in FINAL_LABELS}
        joint["Healthy"] = category_counts["Healthy"] / total
        scores = _finalize_scores(joint)
        return "Healthy", scores

    if case_prediction == "METS":
        joint = {label: 0.0 for label in FINAL_LABELS}
        joint["Metastasis"] = category_counts["METS"] / total
        joint["Healthy"] = category_counts["Healthy"] / total
        joint["Others"] = category_counts["OTHER"] / total
        joint["HGG"] = category_counts["GLI"] / total * 0.5
        joint["LGG"] = category_counts["GLI"] / total * 0.5
        scores = _finalize_scores(joint)
        return "Metastasis", scores

    if case_prediction == "OTHER":
        joint = {label: 0.0 for label in FINAL_LABELS}
        joint["Others"] = category_counts["OTHER"] / total
        joint["Healthy"] = category_counts["Healthy"] / total
        joint["Metastasis"] = category_counts["METS"] / total
        joint["HGG"] = category_counts["GLI"] / total * 0.5
        joint["LGG"] = category_counts["GLI"] / total * 0.5
        scores = _finalize_scores(joint)
        return "Others", scores

    gli_slices = [r for r in slice_results if r.case_category == "GLI"]
    hgg_votes = sum(1 for r in gli_slices if r.final_label == "HGG")
    lgg_votes = len(gli_slices) - hgg_votes
    prediction: Prediction = "HGG" if hgg_votes >= lgg_votes else "LGG"

    joint = {label: 0.0 for label in FINAL_LABELS}
    joint["Healthy"] = category_counts["Healthy"] / total
    joint["Metastasis"] = category_counts["METS"] / total
    joint["Others"] = category_counts["OTHER"] / total
    joint["HGG"] = hgg_votes / total
    joint["LGG"] = lgg_votes / total
    scores = _finalize_scores(joint)
    return prediction, scores


def _case_xai_target_class(case_prediction: CaseCategory) -> int:
    return {"GLI": 0, "METS": 1, "OTHER": 2, "Healthy": 0}[case_prediction]


def _save_grayscale_slice(image: np.ndarray, path: Path) -> None:
    gray = (np.clip(image, 0.0, 1.0) * 255.0).astype(np.uint8)
    save_png(gray, path)


def _generate_slice_xai(
    stage4_tensor: np.ndarray,
    *,
    target_class: int,
    output_dir: Path,
    z: int,
    xai_method: str,
) -> tuple[Path, Path, Path]:
    from .xai.registry import load_stage_model

    model, config = load_stage_model(2)
    batch = tf.constant(np.expand_dims(stage4_tensor, axis=0), dtype=tf.float32)
    explanation = generate_explanation(
        model,
        batch,
        xai_method,
        target_class,
        target_layer=STAGE2_GRADCAM_TARGET_LAYER,
    )
    display_index = config.default_display_channel_index
    grayscale = extract_display_channel(batch.numpy(), display_index)
    overlay_rgb = blend_overlay(grayscale, explanation.heatmap)
    heatmap_rgb = heatmap_to_rgb(explanation.heatmap)

    slug = z
    original_file = output_dir / f"slice_{slug}_original.png"
    xai_file = output_dir / f"slice_{slug}_xai.png"
    heatmap_file = output_dir / f"slice_{slug}_heatmap.png"

    _save_grayscale_slice(grayscale, original_file)
    save_png(overlay_rgb, xai_file)
    save_png(heatmap_rgb, heatmap_file)

    return original_file, xai_file, heatmap_file


def run_volume_segmentation(
    prepared: PreparedScanInputs,
    prediction: Prediction,
    output_dir: Path,
) -> tuple[np.ndarray, dict[int, np.ndarray], list[int]]:
    """
    Run 2D segmentation on each valid slice and return a stacked mask volume.

    Returns (mask_volume, per_z_masks, tumor_z_indices).
    """
    model_type = segmentation_model_type(prediction)
    if model_type is None:
        return np.zeros((0, 0, 0), dtype=np.uint8), {}, []

    masks_by_z: dict[int, np.ndarray] = {}
    for z in prepared.good_slices:
        tensor = build_slice_tensor(
            prepared.volume_map,
            list(MODALITY_ORDER),
            z,
            prepared.reference_depth,
            normalize_segmentation=True,
        )
        masks_by_z[z] = predict_mask(tensor, model_type)

    tumor_z = sorted(z for z, mask in masks_by_z.items() if int(np.sum(mask > 0)) > 0)
    if not masks_by_z:
        return np.zeros((0, 0, 0), dtype=np.uint8), {}, []

    first = next(iter(masks_by_z.values()))
    height, width = first.shape
    depth = prepared.reference_depth
    volume_mask = np.zeros((depth, height, width), dtype=np.uint8)
    for z, mask in masks_by_z.items():
        volume_mask[z] = mask

    return volume_mask, masks_by_z, tumor_z


def _tumor_slices_without_segmentation(
    classification: FullCaseClassification,
) -> list[int]:
    """Fallback tumor-relevant slices when no segmentation model is available."""
    return sorted(
        r.z
        for r in classification.slice_results
        if r.case_category != "Healthy"
    )


def build_tumor_slice_artifacts(
    prepared: PreparedScanInputs,
    classification: FullCaseClassification,
    masks_by_z: dict[int, np.ndarray],
    tumor_z_indices: list[int],
    output_dir: Path,
    backend_public_url: str | None,
    *,
    xai_method: str = ANALYZE_DEFAULT_XAI_METHOD,
) -> tuple[list[TumorSliceArtifact], str | None]:
    if classification.case_prediction == "Healthy":
        return [], None

    if not tumor_z_indices:
        tumor_z_indices = _tumor_slices_without_segmentation(classification)

    if FULL_CASE_MAX_XAI_SLICES > 0 and len(tumor_z_indices) > FULL_CASE_MAX_XAI_SLICES:
        logger.warning(
            "Limiting tumor-slice XAI to %s of %s slices.",
            FULL_CASE_MAX_XAI_SLICES,
            len(tumor_z_indices),
        )
        tumor_z_indices = tumor_z_indices[:FULL_CASE_MAX_XAI_SLICES]

    slice_conf_by_z = {r.z: r.confidence for r in classification.slice_results}
    target_class = _case_xai_target_class(classification.case_prediction)
    xai_dir = output_dir / "xai"
    xai_dir.mkdir(parents=True, exist_ok=True)
    seg_dir = output_dir / "slices"
    seg_dir.mkdir(parents=True, exist_ok=True)

    artifacts: list[TumorSliceArtifact] = []
    xai_error: str | None = None

    for z in tumor_z_indices:
        stage4_tensor = build_slice_tensor(
            prepared.volume_map,
            list(MODALITY_ORDER),
            z,
            prepared.reference_depth,
        )
        t1n = stage4_tensor[:, :, 0]

        original_path = seg_dir / f"slice_{z}_original.png"
        _save_grayscale_slice(t1n, original_path)

        if z in masks_by_z:
            mask = masks_by_z[z]
            seg_path = seg_dir / f"slice_{z}_segmentation.png"
            save_png(overlay_mask_on_t1n(t1n, mask), seg_path)
            seg_url = build_public_upload_url(backend_public_url, seg_path)
        else:
            seg_url = build_public_upload_url(backend_public_url, original_path)

        xai_original_url = build_public_upload_url(backend_public_url, original_path)
        xai_heatmap_url = xai_original_url
        xai_url = xai_original_url
        try:
            xai_orig_file, xai_overlay_file, xai_heat_file = _generate_slice_xai(
                stage4_tensor,
                target_class=target_class,
                output_dir=xai_dir,
                z=z,
                xai_method=xai_method,
            )
            xai_original_url = build_public_upload_url(backend_public_url, xai_orig_file)
            xai_url = build_public_upload_url(backend_public_url, xai_overlay_file)
            xai_heatmap_url = build_public_upload_url(backend_public_url, xai_heat_file)
        except Exception as exc:
            logger.warning("Slice XAI failed for z=%s: %s", z, exc, exc_info=True)
            xai_error = str(exc)

        artifacts.append(
            TumorSliceArtifact(
                z=z,
                slice_number=z,
                confidence=slice_conf_by_z.get(z, classification.average_confidence),
                original_slice=build_public_upload_url(backend_public_url, original_path),
                segmentation=seg_url,
                xai=xai_url,
                xai_original=xai_original_url,
                xai_heatmap=xai_heatmap_url,
            )
        )

    return artifacts, xai_error


def run_full_case_pipeline(
    prepared: PreparedScanInputs,
    files: list,
    backend_public_url: str | None,
    job_id: str | None = None,
) -> FullCaseArtifacts:
    classification = classify_valid_slices(prepared)
    folder = resolve_segmentation_output_dir(files, job_id or uuid.uuid4().hex)
    full_case_dir = folder.parent / "full_case" / (job_id or folder.name)
    full_case_dir.mkdir(parents=True, exist_ok=True)

    segmentation_result: SegmentationArtifacts | None = None
    masks_by_z: dict[int, np.ndarray] = {}
    tumor_z: list[int] = []
    mask_volume_path: str | None = None

    if prediction_supports_segmentation(classification.prediction):
        volume_mask, masks_by_z, tumor_z = run_volume_segmentation(
            prepared,
            classification.prediction,
            full_case_dir,
        )
        if volume_mask.size:
            npz_path = full_case_dir / "mask_volume.npz"
            np.savez_compressed(npz_path, mask=volume_mask)
            mask_volume_path = build_public_upload_url(backend_public_url, npz_path)

        from .segmentation import run_segmentation

        segmentation_result = run_segmentation(
            files,
            classification.prediction,
            folder,
            backend_public_url,
            prepared=prepared,
        )
    elif classification.case_prediction != "Healthy":
        tumor_z = _tumor_slices_without_segmentation(classification)

    tumor_slices, xai_error = build_tumor_slice_artifacts(
        prepared,
        classification,
        masks_by_z,
        tumor_z,
        full_case_dir,
        backend_public_url,
    )

    return FullCaseArtifacts(
        classification=classification,
        tumor_slices=tumor_slices,
        num_tumor_slices=len(tumor_slices),
        segmentation=segmentation_result,
        mask_volume_path=mask_volume_path,
        xai_error=xai_error,
    )


def run_full_case_analysis(
    prepared: PreparedScanInputs,
    files: list,
    *,
    backend_public_url: str | None = None,
    xai_method: str = ANALYZE_DEFAULT_XAI_METHOD,
    job_id: str | None = None,
) -> dict:
    """
    Entry point for the 3D full-case pipeline used by model_runner.

    Returns a dict with pipelineResult, case-level stats, and tumor slice payloads.
    """
    from .pipeline import PipelineResult

    artifacts = run_full_case_pipeline(
        prepared,
        files,
        backend_public_url,
        job_id=job_id or uuid.uuid4().hex,
    )
    classification = artifacts.classification

    pipeline_result = PipelineResult(
        prediction=classification.prediction,
        confidence=classification.confidence,
        confidence_scores=classification.confidence_scores,
        stages_run=["stage1", "stage2", "stage3"],
        stage_details={},
        slice_filter=prepared.slice_filter,
    )

    tumor_slices = [
        {
            "z": item.z,
            "sliceNumber": item.slice_number,
            "confidence": item.confidence,
            "originalSlice": item.original_slice,
            "segmentation": item.segmentation,
            "xai": item.xai,
            "xaiOriginal": item.xai_original,
            "xaiHeatmap": item.xai_heatmap,
        }
        for item in artifacts.tumor_slices
    ]

    mask_metadata: dict | None = None
    if artifacts.mask_volume_path or artifacts.segmentation is not None:
        mask_metadata = {
            "maskVolumePath": artifacts.mask_volume_path,
            "segmentationModel": (
                artifacts.segmentation.model_type if artifacts.segmentation else None
            ),
            "numTumorSlices": artifacts.num_tumor_slices,
        }
        if artifacts.segmentation is not None:
            mask_metadata.update(artifacts.segmentation.metadata)

    return {
        "pipelineResult": pipeline_result,
        "casePrediction": classification.case_prediction,
        "averageConfidence": round(classification.average_confidence / 100.0, 4),
        "averageConfidencePercent": classification.average_confidence,
        "numValidSlices": classification.num_valid_slices,
        "numTumorSlices": artifacts.num_tumor_slices,
        "tumorSlices": tumor_slices,
        "maskMetadata": mask_metadata,
        "segmentationArtifacts": artifacts.segmentation,
        "xaiError": artifacts.xai_error,
    }
