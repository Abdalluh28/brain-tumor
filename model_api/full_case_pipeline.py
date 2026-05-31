from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from .config import ANALYZE_DEFAULT_XAI_METHOD
from .pipeline import (
    SliceCascadeResult,
    aggregate_slice_predictions,
    prediction_to_case_label,
    run_pipeline,
)
from .scan_inputs import prepare_mri_scan_inputs
from .schemas import Prediction, ScanFileIn
from .segmentation import (
    SegmentationArtifacts,
    build_public_upload_url,
    overlay_mask_on_t1n,
    predict_mask,
    prediction_supports_segmentation,
    resolve_segmentation_output_dir,
    run_segmentation,
)
from .volume_cache import (
    build_slice_scan_files,
    cache_nifti_volumes,
    export_mask_nifti,
    export_valid_slices_to_png,
)
from .xai_service import cascade_stage_preview_overlay, run_cascade_xai
from .xai.utils import save_png

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Slice2DRunResult:
    z: int
    cascade: SliceCascadeResult
    segmentation_mask: np.ndarray | None
    xai_overlay_path: str | None
    xai_error: str | None
    png_paths: dict[str, Path]


@dataclass(frozen=True)
class FullCaseArtifacts:
    case_prediction: str
    prediction: Prediction
    average_confidence: float
    confidence_scores: dict
    num_valid_slices: int
    num_tumor_slices: int
    valid_slice_previews: list[dict]
    tumor_slices: list[dict]
    mask_volume_path: str | None
    mask_nifti_path: str | None
    slice_filter: dict
    pipeline_result: object
    segmentation: SegmentationArtifacts | None
    xai_error: str | None
    mask_metadata: dict | None = None


def _slice_confidence_from_pipeline(pipeline_result) -> float:
    if "stage3" in pipeline_result.stage_details:
        value = float(pipeline_result.stage_details["stage3"].confidence)
    elif "stage2" in pipeline_result.stage_details:
        value = float(pipeline_result.stage_details["stage2"].confidence)
    else:
        value = float(pipeline_result.stage_details["stage1"].confidence)
    return round(value * 100, 2) if value <= 1.0 else round(value, 2)


def _run_slice_2d_pipeline(
    z: int,
    slice_files: list[ScanFileIn],
    png_paths: dict[str, Path],
    *,
    backend_public_url: str | None,
    xai_method: str,
    output_dir: Path,
) -> Slice2DRunResult:
    """Run classify + XAI + segmentation on one cached viewer-aligned slice."""
    prepared = prepare_mri_scan_inputs(slice_files)
    pipeline_result = run_pipeline(slice_files, prepared=prepared)

    cascade = SliceCascadeResult(
        z=z,
        prediction=pipeline_result.prediction,
        confidence=_slice_confidence_from_pipeline(pipeline_result),
        case_label=prediction_to_case_label(pipeline_result.prediction),
        stages_run=pipeline_result.stages_run,
        stage_details=pipeline_result.stage_details,
    )

    xai_overlay_path: str | None = None
    xai_error: str | None = None
    if "stage2" in pipeline_result.stages_run:
        try:
            xai_result = run_cascade_xai(
                slice_files,
                pipeline_result,
                cascade_prediction=pipeline_result.prediction,
                xai_method=xai_method,
                backend_public_url=backend_public_url,
                job_id=f"{output_dir.name}_z{z}",
                prepared=prepared,
                analyze_upload=True,
            )
            if xai_result.stages:
                xai_overlay_path = cascade_stage_preview_overlay(xai_result.stages[-1])
        except Exception as exc:
            logger.warning("Slice z=%s XAI failed: %s", z, exc, exc_info=True)
            xai_error = str(exc)

    mask: np.ndarray | None = None
    if prediction_supports_segmentation(pipeline_result.prediction):
        try:
            seg_dir = output_dir / "slice_seg" / f"z{z}"
            seg_dir.mkdir(parents=True, exist_ok=True)
            run_segmentation(
                slice_files,
                pipeline_result.prediction,
                seg_dir,
                backend_public_url,
                prepared=prepared,
            )
            model_type = "GLI" if pipeline_result.prediction in ("HGG", "LGG") else "METS"
            mask = predict_mask(prepared.segmentation_tensor, model_type)
        except Exception as exc:
            logger.warning("Slice z=%s segmentation failed: %s", z, exc, exc_info=True)

    return Slice2DRunResult(
        z=z,
        cascade=cascade,
        segmentation_mask=mask,
        xai_overlay_path=xai_overlay_path,
        xai_error=xai_error,
        png_paths=png_paths,
    )


def run_full_case_pipeline(
    files: list[ScanFileIn],
    backend_public_url: str | None,
    job_id: str | None = None,
    *,
    xai_method: str = ANALYZE_DEFAULT_XAI_METHOD,
) -> FullCaseArtifacts:
    """
    3D full-case flow:
    1. Cache NIfTI volumes (viewer-aligned slice indices)
    2. Filter valid slices (T1c brain-size)
    3. Export all valid slices to PNG (all modalities) — visible before inference
    4. Run 2D pipeline per slice (classify, XAI, segmentation)
    5. Majority vote
    6. Stack masks → 3D NIfTI + NPZ
    """
    job_id = job_id or uuid.uuid4().hex
    cache_dir, volume_map, _modality_map, slice_filter = cache_nifti_volumes(files, job_id)
    good_slices = list(slice_filter["good_slices"])
    reference_depth = int(slice_filter["reference_depth"])

    png_paths, valid_slice_previews = export_valid_slices_to_png(
        volume_map,
        good_slices,
        cache_dir,
        backend_public_url,
    )

    logger.info(
        "Exported %s valid slices × 4 modalities to cache before inference.",
        len(good_slices),
    )

    output_dir = resolve_segmentation_output_dir(files, job_id)
    full_case_dir = output_dir.parent / "full_case" / job_id
    full_case_dir.mkdir(parents=True, exist_ok=True)
    display_dir = full_case_dir / "tumor_slices"
    display_dir.mkdir(parents=True, exist_ok=True)

    slice_runs: list[Slice2DRunResult] = []
    xai_errors: list[str] = []

    for z in good_slices:
        z_png = png_paths[z]
        slice_files = build_slice_scan_files(z, z_png)
        run = _run_slice_2d_pipeline(
            z,
            slice_files,
            z_png,
            backend_public_url=backend_public_url,
            xai_method=xai_method,
            output_dir=full_case_dir,
        )
        slice_runs.append(run)
        if run.xai_error:
            xai_errors.append(f"z{z}: {run.xai_error}")

    slice_cascades = [run.cascade for run in slice_runs]
    (
        case_prediction,
        prediction,
        average_confidence,
        confidence_scores,
        pipeline_result,
    ) = aggregate_slice_predictions(slice_cascades)

    masks_by_z: dict[int, np.ndarray] = {
        run.z: run.segmentation_mask
        for run in slice_runs
        if run.segmentation_mask is not None
    }

    mask_volume_path: str | None = None
    mask_nifti_path: str | None = None
    if masks_by_z:
        first = next(iter(masks_by_z.values()))
        height, width = first.shape
        volume_mask = np.zeros((reference_depth, height, width), dtype=np.uint8)
        for z, mask in masks_by_z.items():
            volume_mask[z] = mask
        npz_path = full_case_dir / "mask_volume.npz"
        np.savez_compressed(npz_path, mask=volume_mask)
        mask_volume_path = build_public_upload_url(backend_public_url, npz_path)

        nifti_path = full_case_dir / "segmentation_mask.nii.gz"
        mask_nifti_path = export_mask_nifti(
            masks_by_z,
            slice_filter,
            nifti_path,
            backend_public_url,
        )

    tumor_z = sorted(z for z, mask in masks_by_z.items() if int(np.sum(mask > 0)) > 0)
    if not tumor_z and case_prediction != "Healthy":
        tumor_z = sorted(run.z for run in slice_runs if run.cascade.case_label != "Healthy")

    tumor_slices: list[dict] = []
    for run in slice_runs:
        if run.z not in tumor_z:
            continue

        t1n_png = run.png_paths["t1n"]
        original_url = build_public_upload_url(backend_public_url, t1n_png)

        seg_url = original_url
        if run.segmentation_mask is not None:
            t1n_arr = np.asarray(Image.open(t1n_png).convert("L"), dtype=np.float32) / 255.0
            seg_path = display_dir / f"slice_{run.z}_segmentation.png"
            save_png(overlay_mask_on_t1n(t1n_arr, run.segmentation_mask), seg_path)
            seg_url = build_public_upload_url(backend_public_url, seg_path)

        tumor_slices.append(
            {
                "z": run.z,
                "sliceNumber": run.z,
                "confidence": run.cascade.confidence,
                "originalSlice": original_url,
                "segmentation": seg_url,
                "xai": run.xai_overlay_path or "",
                "xaiOriginal": original_url,
                "xaiHeatmap": run.xai_overlay_path or "",
            }
        )

    segmentation_result: SegmentationArtifacts | None = None
    if prediction_supports_segmentation(prediction) and tumor_z:
        rep_z = tumor_z[len(tumor_z) // 2]
        rep_files = build_slice_scan_files(rep_z, png_paths[rep_z])
        rep_prepared = prepare_mri_scan_inputs(rep_files)
        segmentation_result = run_segmentation(
            rep_files,
            prediction,
            output_dir,
            backend_public_url,
            prepared=rep_prepared,
        )

    mask_metadata = {
        "maskVolumePath": mask_volume_path,
        "maskNiftiPath": mask_nifti_path,
        "goodSlices": good_slices,
        "cacheDir": slice_filter.get("cacheDir"),
        "nativeShape": slice_filter.get("native_shape"),
        "referenceNiftiPath": slice_filter.get("referenceNiftiPath"),
    }
    if segmentation_result is not None:
        mask_metadata["segmentationModel"] = segmentation_result.model_type
        mask_metadata.update(segmentation_result.metadata)

    return FullCaseArtifacts(
        case_prediction=case_prediction,
        prediction=prediction,
        average_confidence=average_confidence,
        confidence_scores=confidence_scores,
        num_valid_slices=len(good_slices),
        num_tumor_slices=len(tumor_slices),
        valid_slice_previews=valid_slice_previews,
        tumor_slices=tumor_slices,
        mask_volume_path=mask_volume_path,
        mask_nifti_path=mask_nifti_path,
        slice_filter=slice_filter,
        pipeline_result=pipeline_result,
        segmentation=segmentation_result,
        xai_error="; ".join(xai_errors) if xai_errors else None,
        mask_metadata=mask_metadata,
    )
