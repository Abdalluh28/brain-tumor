from __future__ import annotations

import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from .config import (
    ANALYZE_DEFAULT_XAI_METHOD,
    FULL_CASE_BATCH_SEGMENTATION,
    FULL_CASE_MAX_XAI_SLICES,
    FULL_CASE_PARALLEL_WORKERS,
)
from .pipeline import (
    PipelineResult,
    SliceCascadeResult,
    aggregate_slice_predictions,
    prediction_to_case_label,
    run_per_slice_cascade,
)
from .scan_inputs import (
    prepare_prepared_scan_inputs_from_volumes,
    prepare_single_slice_prepared_from_volume,
)
from .schemas import Prediction, ScanFileIn
from .segmentation import (
    SegmentationArtifacts,
    build_public_upload_url,
    overlay_mask_on_t1n,
    predict_mask,
    predict_masks_batch,
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

# Serialize TensorFlow GPU calls across parallel 3D slice workers.
_FULL_CASE_INFERENCE_LOCK = threading.Lock()


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


def _pipeline_result_from_slice(
    cascade: SliceCascadeResult,
    slice_filter: dict,
) -> PipelineResult:
    return PipelineResult(
        prediction=cascade.prediction,
        confidence=cascade.confidence,
        confidence_scores={cascade.prediction: cascade.confidence},
        stages_run=cascade.stages_run,
        stage_details=cascade.stage_details,
        slice_filter=slice_filter,
    )


def _select_slices_for_xai(
    slice_cascades: list[SliceCascadeResult],
) -> list[SliceCascadeResult]:
    """Slices that ran stage 2 (tumor path), optionally capped for upload time."""
    candidates = [c for c in slice_cascades if "stage2" in c.stages_run]
    if FULL_CASE_MAX_XAI_SLICES <= 0 or len(candidates) <= FULL_CASE_MAX_XAI_SLICES:
        return candidates
    ranked = sorted(candidates, key=lambda c: c.confidence, reverse=True)
    return ranked[:FULL_CASE_MAX_XAI_SLICES]


def _run_slice_xai(
    z: int,
    cascade: SliceCascadeResult,
    slice_files: list[ScanFileIn],
    prepared,
    *,
    backend_public_url: str | None,
    xai_method: str,
    output_dir: Path,
    slice_filter: dict,
) -> tuple[str | None, str | None]:
    pipeline_result = _pipeline_result_from_slice(cascade, slice_filter)
    try:
        with _FULL_CASE_INFERENCE_LOCK:
            xai_result = run_cascade_xai(
                slice_files,
                pipeline_result,
                cascade_prediction=cascade.prediction,
                xai_method=xai_method,
                backend_public_url=backend_public_url,
                job_id=f"{output_dir.name}_z{z}",
                prepared=prepared,
                analyze_upload=True,
            )
        if xai_result.stages:
            return cascade_stage_preview_overlay(xai_result.stages[-1]), None
        return None, None
    except Exception as exc:
        logger.warning("Slice z=%s XAI failed: %s", z, exc, exc_info=True)
        return None, str(exc)


def _run_slice_extras(
    z: int,
    cascade: SliceCascadeResult,
    slice_files: list[ScanFileIn],
    png_paths: dict[str, Path],
    *,
    volume_map: dict[str, np.ndarray],
    modality_map: dict[str, ScanFileIn],
    reference_depth: int,
    slice_filter: dict,
    backend_public_url: str | None,
    xai_method: str,
    output_dir: Path,
    segmentation_mask: np.ndarray | None,
) -> Slice2DRunResult:
    """XAI for one slice (segmentation mask may already be batched)."""
    prepared = prepare_single_slice_prepared_from_volume(
        volume_map,
        modality_map,
        z,
        reference_depth,
        slice_filter,
    )

    xai_overlay_path: str | None = None
    xai_error: str | None = None
    if "stage2" in cascade.stages_run:
        xai_overlay_path, xai_error = _run_slice_xai(
            z,
            cascade,
            slice_files,
            prepared,
            backend_public_url=backend_public_url,
            xai_method=xai_method,
            output_dir=output_dir,
            slice_filter=slice_filter,
        )

    return Slice2DRunResult(
        z=z,
        cascade=cascade,
        segmentation_mask=segmentation_mask,
        xai_overlay_path=xai_overlay_path,
        xai_error=xai_error,
        png_paths=png_paths,
    )


def _batch_segmentation_masks(
    slice_cascades: list[SliceCascadeResult],
    volume_map: dict[str, np.ndarray],
    reference_depth: int,
) -> dict[int, np.ndarray]:
    """Predict segmentation masks for all qualifying slices in GLI/METS batches."""
    gli_items: list[tuple[int, np.ndarray]] = []
    mets_items: list[tuple[int, np.ndarray]] = []

    for cascade in slice_cascades:
        if not prediction_supports_segmentation(cascade.prediction):
            continue
        prepared = prepare_single_slice_prepared_from_volume(
            volume_map,
            {},
            cascade.z,
            reference_depth,
            {"good_slices": [cascade.z], "reference_depth": reference_depth},
        )
        tensor = prepared.segmentation_tensor
        if cascade.prediction in ("HGG", "LGG"):
            gli_items.append((cascade.z, tensor))
        else:
            mets_items.append((cascade.z, tensor))

    masks_by_z: dict[int, np.ndarray] = {}

    def _run_batch(items: list[tuple[int, np.ndarray]], model_type: str) -> None:
        if not items:
            return
        zs, tensors = zip(*items, strict=True)
        batch = np.stack(tensors, axis=0).astype(np.float32)
        with _FULL_CASE_INFERENCE_LOCK:
            predicted = predict_masks_batch(batch, model_type)
        for z, mask in zip(zs, predicted, strict=True):
            masks_by_z[int(z)] = mask

    _run_batch(gli_items, "GLI")
    _run_batch(mets_items, "METS")
    return masks_by_z


def _segmentation_mask_per_slice(
    cascade: SliceCascadeResult,
    volume_map: dict[str, np.ndarray],
    reference_depth: int,
) -> np.ndarray | None:
    if not prediction_supports_segmentation(cascade.prediction):
        return None
    prepared = prepare_single_slice_prepared_from_volume(
        volume_map,
        {},
        cascade.z,
        reference_depth,
        {"good_slices": [cascade.z], "reference_depth": reference_depth},
    )
    model_type = "GLI" if cascade.prediction in ("HGG", "LGG") else "METS"
    with _FULL_CASE_INFERENCE_LOCK:
        return predict_mask(prepared.segmentation_tensor, model_type)


def _process_slices_parallel(
    slice_cascades: list[SliceCascadeResult],
    *,
    png_paths: dict[int, dict[str, Path]],
    volume_map: dict[str, np.ndarray],
    modality_map: dict[str, ScanFileIn],
    reference_depth: int,
    slice_filter: dict,
    backend_public_url: str | None,
    xai_method: str,
    output_dir: Path,
) -> tuple[list[Slice2DRunResult], list[str]]:
    xai_targets = {c.z for c in _select_slices_for_xai(slice_cascades)}
    cascade_by_z = {c.z: c for c in slice_cascades}

    if FULL_CASE_BATCH_SEGMENTATION:
        masks_by_z = _batch_segmentation_masks(
            slice_cascades, volume_map, reference_depth
        )
    else:
        masks_by_z = {}

    slice_runs: list[Slice2DRunResult] = []
    xai_errors: list[str] = []

    def _work(z: int) -> Slice2DRunResult:
        cascade = cascade_by_z[z]
        z_png = png_paths[z]
        slice_files = build_slice_scan_files(z, z_png)

        mask = masks_by_z.get(z)
        if mask is None and prediction_supports_segmentation(cascade.prediction):
            mask = _segmentation_mask_per_slice(
                cascade, volume_map, reference_depth
            )

        if z in xai_targets:
            return _run_slice_extras(
                z,
                cascade,
                slice_files,
                z_png,
                volume_map=volume_map,
                modality_map=modality_map,
                reference_depth=reference_depth,
                slice_filter=slice_filter,
                backend_public_url=backend_public_url,
                xai_method=xai_method,
                output_dir=output_dir,
                segmentation_mask=mask,
            )

        return Slice2DRunResult(
            z=z,
            cascade=cascade,
            segmentation_mask=mask,
            xai_overlay_path=None,
            xai_error=None,
            png_paths=z_png,
        )

    workers = max(1, FULL_CASE_PARALLEL_WORKERS)
    if workers == 1 or len(slice_cascades) <= 1:
        for cascade in slice_cascades:
            run = _work(cascade.z)
            slice_runs.append(run)
            if run.xai_error:
                xai_errors.append(f"z{run.z}: {run.xai_error}")
    else:
        logger.info(
            "3D full-case: running %s slices with %s parallel workers (batched classify + parallel XAI).",
            len(slice_cascades),
            workers,
        )
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(_work, cascade.z): cascade.z
                for cascade in slice_cascades
            }
            results_by_z: dict[int, Slice2DRunResult] = {}
            for future in as_completed(futures):
                z = futures[future]
                run = future.result()
                results_by_z[z] = run
                if run.xai_error:
                    xai_errors.append(f"z{run.z}: {run.xai_error}")

        slice_runs = [results_by_z[cascade.z] for cascade in slice_cascades]

    return slice_runs, xai_errors


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
    4. Batched per-slice classification, then parallel XAI + batched segmentation
    5. Majority vote
    6. Stack masks → 3D NIfTI + NPZ
    """
    job_id = job_id or uuid.uuid4().hex
    cache_dir, volume_map, modality_map, slice_filter = cache_nifti_volumes(files, job_id)
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

    prepared = prepare_prepared_scan_inputs_from_volumes(
        volume_map,
        modality_map,
        slice_filter,
    )
    slice_cascades = run_per_slice_cascade(prepared)
    logger.info(
        "3D full-case: batched cascade classification on %s slices.",
        len(slice_cascades),
    )

    slice_runs, xai_errors = _process_slices_parallel(
        slice_cascades,
        png_paths=png_paths,
        volume_map=volume_map,
        modality_map=modality_map,
        reference_depth=reference_depth,
        slice_filter=slice_filter,
        backend_public_url=backend_public_url,
        xai_method=xai_method,
        output_dir=full_case_dir,
    )

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
        rep_prepared = prepare_single_slice_prepared_from_volume(
            volume_map,
            modality_map,
            rep_z,
            reference_depth,
            slice_filter,
        )
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
