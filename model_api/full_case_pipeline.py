from __future__ import annotations

import logging
import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from .config import (
    ANALYZE_DEFAULT_XAI_METHOD,
    ANALYZE_XAI_FALLBACK_METHODS,
    FULL_CASE_BATCH_SEGMENTATION,
    FULL_CASE_INFERENCE_BATCH_SIZE,
    FULL_CASE_MAX_XAI_SLICES,
    FULL_CASE_SEG_BATCH_SIZE,
    MODALITY_ORDER,
)
from .inference import keras_predict_batch_proba
from .pipeline import (
    STAGE1_LABELS,
    STAGE2_LABELS,
    STAGE3_LABELS,
    PipelineResult,
    SliceCascadeResult,
    _finalize_slice_prediction,
    _load_models,
    _slice_stage_prediction,
    aggregate_slice_predictions,
    prediction_to_case_label,
)
from .scan_inputs import (
    prepare_prepared_scan_inputs_from_volumes,
    prepare_single_slice_prepared_from_volume,
)
from .tf_device import configure_tensorflow
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
    summarize_mask,
)
from .volume_cache import (
    build_slice_scan_files,
    cache_nifti_volumes,
    export_mask_nifti,
    export_valid_slices_to_png,
)
from .xai_service import cascade_stage_preview_overlay, run_cascade_xai
from .xai.utils import resolve_xai_output_dir, save_png

logger = logging.getLogger(__name__)


def _predict_batch_in_chunks(model, tensor: np.ndarray, chunk_size: int) -> np.ndarray:
    """Run model on tensor (N, H, W, C) in small batches to limit peak memory."""
    n = int(tensor.shape[0])
    if chunk_size <= 0 or n <= chunk_size:
        return keras_predict_batch_proba(model, tensor)

    parts: list[np.ndarray] = []
    for start in range(0, n, chunk_size):
        end = min(start + chunk_size, n)
        parts.append(keras_predict_batch_proba(model, tensor[start:end]))
    return np.concatenate(parts, axis=0)


def run_per_slice_cascade_chunked(
    prepared: PreparedScanInputs,
    *,
    batch_size: int = FULL_CASE_INFERENCE_BATCH_SIZE,
) -> list[SliceCascadeResult]:
    """
    Hierarchical cascade on all valid slices with chunked GPU/CPU inference.

    Same logic as pipeline.run_per_slice_cascade but caps batch size so large
  3D volumes do not allocate tensors like (69, 240, 240, 64) at once.
    """
    configure_tensorflow()
    stage1_model, stage2_model, stage3_model = _load_models()

    good_slices = list(prepared.slice_filter["good_slices"])
    stage1_probs = _predict_batch_in_chunks(
        stage1_model, prepared.stage1_tensor, batch_size
    )
    stage4_tensor = prepared.stage4_tensor

    slice_results: list[SliceCascadeResult] = []

    tumor_indices = [
        i for i, probs in enumerate(stage1_probs) if int(np.argmax(probs)) == 1
    ]
    stage2_probs_map: dict[int, np.ndarray] = {}
    stage3_probs_map: dict[int, np.ndarray] = {}

    if tumor_indices:
        tumor_batch = stage4_tensor[tumor_indices]
        tumor_stage2_probs = _predict_batch_in_chunks(
            stage2_model, tumor_batch, batch_size
        )
        for local_i, global_i in enumerate(tumor_indices):
            stage2_probs_map[global_i] = tumor_stage2_probs[local_i]

        gli_indices = [
            global_i
            for global_i in tumor_indices
            if int(np.argmax(stage2_probs_map[global_i])) == 0
        ]
        if gli_indices:
            gli_batch = stage4_tensor[gli_indices]
            gli_stage3_probs = _predict_batch_in_chunks(
                stage3_model, gli_batch, batch_size
            )
            for local_i, global_i in enumerate(gli_indices):
                stage3_probs_map[global_i] = gli_stage3_probs[local_i]

    for i, z in enumerate(good_slices):
        stage_details: dict = {}
        stages_run: list[str] = ["stage1"]
        stage_details["stage1"] = _slice_stage_prediction(STAGE1_LABELS, stage1_probs[i])

        if stage_details["stage1"].label == "Healthy":
            prediction, confidence = _finalize_slice_prediction(
                stage_details, stages_run
            )
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
            prediction, confidence = _finalize_slice_prediction(
                stage_details, stages_run
            )
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
    slice_results: list[dict]
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


def _resolve_tumor_z_set(masks_by_z: dict[int, np.ndarray]) -> set[int]:
    """Slice indices with at least one segmented tumor pixel (class > 0)."""
    return {
        int(z)
        for z, mask in masks_by_z.items()
        if int(np.sum(mask > 0)) > 0
    }


def _xai_target_z_set(
    slice_cascades: list[SliceCascadeResult],
) -> set[int]:
    """Every slice that ran stage 2 (non-healthy tumor path) gets Grad-CAM++."""
    cascade_by_z = {int(c.z): c for c in slice_cascades}
    targets = {
        int(c.z) for c in slice_cascades if "stage2" in c.stages_run
    }
    if FULL_CASE_MAX_XAI_SLICES > 0 and len(targets) > FULL_CASE_MAX_XAI_SLICES:
        ranked = sorted(
            targets,
            key=lambda z: cascade_by_z[z].confidence,
            reverse=True,
        )
        targets = set(ranked[:FULL_CASE_MAX_XAI_SLICES])
        logger.warning(
            "3D full-case: XAI capped at %s slices (FULL_CASE_MAX_XAI_SLICES); "
            "set 0 for all tumor-path slices.",
            FULL_CASE_MAX_XAI_SLICES,
        )
    return targets


def _publish_xai_png(
    source: Path,
    display_dir: Path,
    z: int,
    suffix: str,
    backend_public_url: str | None,
) -> str:
    display_dir.mkdir(parents=True, exist_ok=True)
    dest = display_dir / f"slice_{z}_xai_{suffix}.png"
    shutil.copy2(source, dest)
    return build_public_upload_url(backend_public_url, dest)


def _recover_xai_overlay_from_disk(
    z: int,
    slice_files: list[ScanFileIn],
    xai_job_id: str,
    display_dir: Path,
    backend_public_url: str | None,
) -> str | None:
    """Use saved overlay/heatmap PNGs when the public URL was missing."""
    try:
        local_files = [
            ScanFileIn(
                rawPath=f.rawPath,
                format=f.format,
                originalName=f.originalName,
                slot=f.slot,
            )
            for f in slice_files
        ]
        xai_dir = resolve_xai_output_dir(local_files, xai_job_id)
    except Exception:
        return None

    if not xai_dir.is_dir():
        return None

    overlay_files = sorted(
        xai_dir.glob("overlay_stage2_*.png"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if overlay_files:
        return _publish_xai_png(
            overlay_files[0],
            display_dir,
            z,
            "t1c",
            backend_public_url,
        )

    heatmap_files = sorted(
        xai_dir.glob("heatmap_stage2_*.png"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if heatmap_files:
        return _publish_xai_png(
            heatmap_files[0],
            display_dir,
            z,
            "heatmap",
            backend_public_url,
        )

    return None


def _compose_xai_overlay_on_t1c(
    prepared,
    heatmap_path: Path,
    display_dir: Path,
    z: int,
    backend_public_url: str | None,
) -> str | None:
    """Blend a saved heatmap onto T1c when no overlay PNG exists."""
    from .xai.utils import blend_overlay, extract_display_channel

    try:
        t1c_idx = MODALITY_ORDER.index("t1c")
        t1c = extract_display_channel(prepared.xai_stage4_tensor, t1c_idx)
        heat_rgb = np.asarray(Image.open(heatmap_path).convert("RGB"), dtype=np.float32)
        if heat_rgb.ndim != 3:
            return None
        heat_norm = heat_rgb.max(axis=-1) / 255.0
        overlay_rgb = blend_overlay(t1c, heat_norm.astype(np.float32))
        dest = display_dir / f"slice_{z}_xai_t1c_blend.png"
        save_png(overlay_rgb, dest)
        return build_public_upload_url(backend_public_url, dest)
    except Exception as exc:
        logger.debug("Slice z=%s T1c XAI composite failed: %s", z, exc)
        return None


def _run_slice_xai(
    z: int,
    cascade: SliceCascadeResult,
    slice_files: list[ScanFileIn],
    prepared,
    *,
    backend_public_url: str | None,
    xai_method: str,
    output_dir: Path,
    display_dir: Path,
    slice_filter: dict,
) -> tuple[str | None, str | None]:
    pipeline_result = _pipeline_result_from_slice(cascade, slice_filter)
    xai_job_id = f"{output_dir.name}_z{z}"
    methods_to_try = tuple(
        dict.fromkeys(
            (xai_method,)
            + tuple(m for m in ANALYZE_XAI_FALLBACK_METHODS if m != xai_method)
        )
    )
    last_error: str | None = None
    last_xai_dir: Path | None = None

    for method in methods_to_try:
        try:
            xai_result = run_cascade_xai(
                slice_files,
                pipeline_result,
                cascade_prediction=cascade.prediction,
                xai_method=method,
                backend_public_url=backend_public_url,
                job_id=xai_job_id,
                prepared=prepared,
                analyze_upload=True,
            )
            if not xai_result.stages:
                last_error = f"No XAI stages returned ({method})"
                continue

            stage = xai_result.stages[-1]
            overlay = cascade_stage_preview_overlay(stage)
            if overlay:
                if method != xai_method:
                    logger.info(
                        "Slice z=%s XAI used fallback method '%s' (requested '%s').",
                        z,
                        method,
                        xai_method,
                    )
                return overlay, None

            try:
                local_files = slice_files
                last_xai_dir = resolve_xai_output_dir(local_files, xai_job_id)
            except Exception:
                last_xai_dir = None

            recovered = _recover_xai_overlay_from_disk(
                z,
                slice_files,
                xai_job_id,
                display_dir,
                backend_public_url,
            )
            if recovered:
                return recovered, None

            if last_xai_dir and last_xai_dir.is_dir():
                heatmaps = sorted(last_xai_dir.glob("heatmap_stage2_*.png"))
                if heatmaps:
                    composed = _compose_xai_overlay_on_t1c(
                        prepared,
                        heatmaps[-1],
                        display_dir,
                        z,
                        backend_public_url,
                    )
                    if composed:
                        return composed, None

            last_error = f"Empty overlay path ({method})"
        except Exception as exc:
            last_error = str(exc)
            logger.warning(
                "Slice z=%s XAI failed with '%s': %s",
                z,
                method,
                exc,
                exc_info=True,
            )

    recovered = _recover_xai_overlay_from_disk(
        z,
        slice_files,
        xai_job_id,
        display_dir,
        backend_public_url,
    )
    if recovered:
        return recovered, None

    return None, last_error


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

    chunk = max(1, FULL_CASE_SEG_BATCH_SIZE)

    def _run_batch(items: list[tuple[int, np.ndarray]], model_type: str) -> None:
        if not items:
            return
        for start in range(0, len(items), chunk):
            chunk_items = items[start : start + chunk]
            zs, tensors = zip(*chunk_items, strict=True)
            batch = np.stack(tensors, axis=0).astype(np.float32)
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
    return predict_mask(prepared.segmentation_tensor, model_type)


def _process_slice_extras(
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
    cascade_by_z = {int(c.z): c for c in slice_cascades}

    if FULL_CASE_BATCH_SEGMENTATION:
        masks_by_z = _batch_segmentation_masks(
            slice_cascades, volume_map, reference_depth
        )
    else:
        masks_by_z = {}

    xai_targets = _xai_target_z_set(slice_cascades)
    display_dir = output_dir / "slice_xai"
    display_dir.mkdir(parents=True, exist_ok=True)
    logger.info(
        "3D full-case: generating XAI for %s tumor-path slice(s).",
        len(xai_targets),
    )

    slice_runs: list[Slice2DRunResult] = []
    xai_errors: list[str] = []

    def _run_xai_for_z(z: int, cascade: SliceCascadeResult) -> tuple[str | None, str | None]:
        z_png = png_paths[z]
        slice_files = build_slice_scan_files(z, z_png)
        prepared = prepare_single_slice_prepared_from_volume(
            volume_map,
            modality_map,
            z,
            reference_depth,
            slice_filter,
        )
        return _run_slice_xai(
            z,
            cascade,
            slice_files,
            prepared,
            backend_public_url=backend_public_url,
            xai_method=xai_method,
            output_dir=output_dir,
            display_dir=display_dir,
            slice_filter=slice_filter,
        )

    for cascade in slice_cascades:
        z = int(cascade.z)
        z_png = png_paths[z]

        mask = masks_by_z.get(z)
        if mask is None and prediction_supports_segmentation(cascade.prediction):
            mask = _segmentation_mask_per_slice(
                cascade, volume_map, reference_depth
            )

        xai_overlay_path: str | None = None
        xai_error: str | None = None
        if z in xai_targets:
            xai_overlay_path, xai_error = _run_xai_for_z(z, cascade)
            if xai_error and not xai_overlay_path:
                xai_overlay_path, xai_error = _run_xai_for_z(z, cascade)

        run = Slice2DRunResult(
            z=z,
            cascade=cascade,
            segmentation_mask=mask,
            xai_overlay_path=xai_overlay_path,
            xai_error=xai_error,
            png_paths=z_png,
        )
        slice_runs.append(run)
        if xai_error:
            xai_errors.append(f"z{z}: {xai_error}")

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
    4. Chunked batched classification, then serial XAI + chunked segmentation
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
    slice_cascades = run_per_slice_cascade_chunked(prepared)
    logger.info(
        "3D full-case: chunked cascade classification on %s slices (batch size %s).",
        len(slice_cascades),
        FULL_CASE_INFERENCE_BATCH_SIZE,
    )

    slice_runs, xai_errors = _process_slice_extras(
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
    volume_class_stats = None
    volume_total_pixels: int | None = None
    volume_tumor_pixels: int | None = None
    volume_tumor_percentage: float | None = None
    if masks_by_z:
        first = next(iter(masks_by_z.values()))
        height, width = first.shape
        volume_mask = np.zeros((reference_depth, height, width), dtype=np.uint8)
        for z, mask in masks_by_z.items():
            volume_mask[z] = mask
        npz_path = full_case_dir / "mask_volume.npz"
        np.savez_compressed(npz_path, mask=volume_mask)
        mask_volume_path = build_public_upload_url(backend_public_url, npz_path)

        volume_class_stats = summarize_mask(volume_mask)
        volume_total_pixels = int(volume_mask.size)
        volume_tumor_pixels = int(np.sum(volume_mask > 0))
        volume_tumor_percentage = round(float(np.mean(volume_mask > 0)) * 100, 2)

        nifti_path = full_case_dir / "segmentation_mask.nii.gz"
        mask_nifti_path = export_mask_nifti(
            masks_by_z,
            slice_filter,
            nifti_path,
            backend_public_url,
        )

    tumor_z = sorted(_resolve_tumor_z_set(masks_by_z))
    preview_by_z = {int(row["z"]): row for row in valid_slice_previews}
    runs_by_z = {int(run.z): run for run in slice_runs}

    slice_results: list[dict] = []
    tumor_slices: list[dict] = []

    for z in good_slices:
        z = int(z)
        run = runs_by_z[z]
        preview = preview_by_z.get(z, {})
        cascade = run.cascade

        modalities = preview.get("modalities") or {
            mod: build_public_upload_url(backend_public_url, run.png_paths[mod])
            for mod in MODALITY_ORDER
            if mod in run.png_paths
        }

        t1c_png = run.png_paths["t1c"]
        t1c_url = build_public_upload_url(backend_public_url, t1c_png)

        seg_url = ""
        if run.segmentation_mask is not None:
            t1c_arr = (
                np.asarray(Image.open(t1c_png).convert("L"), dtype=np.float32) / 255.0
            )
            seg_path = display_dir / f"slice_{z}_segmentation_t1c.png"
            save_png(overlay_mask_on_t1n(t1c_arr, run.segmentation_mask), seg_path)
            seg_url = build_public_upload_url(backend_public_url, seg_path)

        xai_overlay = run.xai_overlay_path or ""

        if z not in tumor_z:
            continue

        slice_entry = {
            "z": z,
            "sliceNumber": z,
            "prediction": cascade.prediction,
            "confidence": cascade.confidence,
            "modalities": modalities,
            "t1cReference": t1c_url,
            "xaiOverlay": xai_overlay,
            "segmentationOverlay": seg_url,
        }
        slice_results.append(slice_entry)

        tumor_slices.append(
            {
                "z": z,
                "sliceNumber": z,
                "confidence": cascade.confidence,
                "originalSlice": t1c_url,
                "segmentation": seg_url or t1c_url,
                "xai": xai_overlay,
                "xaiOriginal": t1c_url,
                "xaiHeatmap": xai_overlay,
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
    if volume_class_stats is not None:
        mask_metadata["classStats"] = [
            {
                "classId": stat.class_id,
                "label": stat.label,
                "colorHex": stat.color_hex,
                "pixelCount": stat.pixel_count,
                "percentage": stat.percentage,
            }
            for stat in volume_class_stats
        ]
        mask_metadata["totalPixels"] = volume_total_pixels
        mask_metadata["tumorPixels"] = volume_tumor_pixels
        mask_metadata["tumorPercentage"] = volume_tumor_percentage
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
        slice_results=slice_results,
        tumor_slices=tumor_slices,
        mask_volume_path=mask_volume_path,
        mask_nifti_path=mask_nifti_path,
        slice_filter=slice_filter,
        pipeline_result=pipeline_result,
        segmentation=segmentation_result,
        xai_error="; ".join(xai_errors) if xai_errors else None,
        mask_metadata=mask_metadata,
    )
