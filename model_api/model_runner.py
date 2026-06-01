import logging
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote

from .config import (
    ANALYZE_DEFAULT_XAI_METHOD,
    ANALYZE_PARALLEL_SEGMENTATION_AND_XAI,
    ANALYZE_XAI_FALLBACK_METHODS,
)
from .pipeline import get_model_version, run_pipeline
from .scan_inputs import prepare_mri_scan_inputs
from .full_case_pipeline import run_full_case_pipeline
from .schemas import (
    FullCaseResult,
    ModelResult,
    ScanFileIn,
    SegmentationClassStatOut,
    SegmentationResult,
    TumorSliceOut,
    ValidSlicePreviewOut,
)
from .segmentation import (
    prediction_supports_segmentation,
    resolve_segmentation_output_dir,
    run_segmentation,
)
from .xai_service import cascade_stage_preview_overlay, run_cascade_xai

IMAGE_FORMATS = {"png", "jpg", "jpeg"}
VOLUME_FORMATS = {"nii", "nii.gz", "dcm"}

logger = logging.getLogger(__name__)

# Grad-CAM fallbacks on analyze upload (PCI is on-demand via the UI only).
ANALYZE_XAI_METHODS_TO_TRY = (ANALYZE_DEFAULT_XAI_METHOD,) + ANALYZE_XAI_FALLBACK_METHODS


def _grad_cam_path(files: list[ScanFileIn], backend_public_url: str | None) -> str:
    image_file = next(
        (scan_file for scan_file in files if scan_file.format in IMAGE_FORMATS),
        None,
    )

    if image_file and backend_public_url:
        normalized = image_file.rawPath.replace("\\", "/")
        marker = "/uploads/"

        if marker in normalized:
            upload_path = normalized.split(marker, 1)[1]
            return f"{backend_public_url.rstrip('/')}/uploads/{quote(upload_path)}"

    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'>"
        "<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>"
        "<stop stop-color='#2563eb'/><stop offset='.45' stop-color='#facc15'/>"
        "<stop offset='1' stop-color='#dc2626'/></linearGradient></defs>"
        "<rect width='640' height='420' fill='#0f172a'/>"
        "<ellipse cx='320' cy='210' rx='190' ry='145' fill='#e2e8f0' opacity='.9'/>"
        "<circle cx='360' cy='190' r='95' fill='url(#g)' opacity='.78'/>"
        "<circle cx='290' cy='245' r='58' fill='#38bdf8' opacity='.5'/>"
        "<text x='320' y='370' text-anchor='middle' fill='#f8fafc' "
        "font-family='Arial' font-size='24'>Grad-CAM preview</text></svg>"
    )
    return f"data:image/svg+xml;utf8,{quote(svg)}"


def _validate_scan_type_files(files: list[ScanFileIn], scan_type: str | None) -> None:
    formats = {scan_file.format for scan_file in files}

    if scan_type == "MRI" and not formats.issubset(IMAGE_FORMATS):
        raise ValueError("MRI scans must use image files: png, jpg, or jpeg.")

    if scan_type == "3D" and not formats.issubset(VOLUME_FORMATS):
        raise ValueError("3D scans must use medical volume files: nii, nii.gz, or dcm.")


def _to_segmentation_result(artifacts) -> SegmentationResult:
    return SegmentationResult(
        modelType=artifacts.model_type,
        maskPath=artifacts.mask_path,
        overlayPath=artifacts.overlay_path,
        legendPath=artifacts.legend_path,
        distributionPath=artifacts.distribution_path,
        classStats=[
            SegmentationClassStatOut(
                classId=stat.class_id,
                label=stat.label,
                colorHex=stat.color_hex,
                pixelCount=stat.pixel_count,
                percentage=stat.percentage,
            )
            for stat in artifacts.class_stats
        ],
        metadata=artifacts.metadata,
    )


def _run_cascade_xai_for_analyze(
    files: list[ScanFileIn],
    pipeline_result,
    *,
    xai_method: str,
    backend_public_url: str | None,
    xai_job_id: str,
    prepared,
) -> tuple:
    methods_to_try = tuple(
        dict.fromkeys(
            (xai_method,) + tuple(m for m in ANALYZE_XAI_METHODS_TO_TRY if m != xai_method)
        )
    )
    last_error: str | None = None

    for method in methods_to_try:
        try:
            xai_result = run_cascade_xai(
                files,
                pipeline_result,
                cascade_prediction=pipeline_result.prediction,
                xai_method=method,
                backend_public_url=backend_public_url,
                job_id=xai_job_id,
                prepared=prepared,
                analyze_upload=True,
            )
            if method != xai_method:
                logger.info(
                    "Cascade XAI succeeded with fallback method '%s' "
                    "(requested '%s') for prediction %s",
                    method,
                    xai_method,
                    pipeline_result.prediction,
                )
            return xai_result, None
        except Exception as exc:
            last_error = str(exc)
            logger.warning(
                "Cascade XAI failed for prediction %s with method '%s': %s",
                pipeline_result.prediction,
                method,
                exc,
                exc_info=True,
            )

    return None, last_error


def run_full_case_model(
    files: list[ScanFileIn],
    backend_public_url: str | None = None,
    *,
    xai_method: str | None = None,
) -> ModelResult:
    """3D full-case: per-slice cascade, majority vote, volume segmentation, slice XAI."""
    if xai_method is None:
        xai_method = ANALYZE_DEFAULT_XAI_METHOD
    started_at = time.perf_counter()

    artifacts = run_full_case_pipeline(
        files,
        backend_public_url,
        job_id=uuid.uuid4().hex,
    )

    full_case = FullCaseResult(
        casePrediction=artifacts.case_prediction,
        averageConfidence=round(artifacts.average_confidence / 100.0, 4),
        averageConfidencePercent=artifacts.average_confidence,
        numValidSlices=artifacts.num_valid_slices,
        numTumorSlices=artifacts.num_tumor_slices,
        validSlicePreviews=[
            ValidSlicePreviewOut(**item) for item in artifacts.valid_slice_previews
        ],
        tumorSlices=[TumorSliceOut(**item) for item in artifacts.tumor_slices],
        maskMetadata=artifacts.mask_metadata,
    )

    grad_cam_path = _grad_cam_path(files, backend_public_url)
    if full_case.tumorSlices:
        first = full_case.tumorSlices[0]
        grad_cam_path = first.xai or first.segmentation or first.originalSlice

    segmentation_result: SegmentationResult | None = None
    if artifacts.segmentation is not None:
        segmentation_result = _to_segmentation_result(artifacts.segmentation)

    return ModelResult(
        prediction=artifacts.prediction,
        confidenceScores=artifacts.confidence_scores,
        confidence=artifacts.average_confidence,
        gradCamPath=grad_cam_path,
        processedTime=round((time.perf_counter() - started_at) * 1000, 2),
        modelVersion=os.getenv("MODEL_VERSION", get_model_version()) + "-fullcase-3d",
        segmentation=segmentation_result,
        xai=None,
        xaiError=artifacts.xai_error,
        sliceFiltering=artifacts.slice_filter,
        fullCase=full_case,
    )


def run_model(
    files: list[ScanFileIn],
    backend_public_url: str | None = None,
    scan_type: str | None = None,
    *,
    run_xai: bool = True,
    xai_method: str | None = None,
) -> ModelResult:
    if xai_method is None:
        xai_method = ANALYZE_DEFAULT_XAI_METHOD
    started_at = time.perf_counter()

    for scan_file in files:
        if not Path(scan_file.rawPath).exists():
            raise FileNotFoundError(f"Input file not found: {scan_file.rawPath}")

    _validate_scan_type_files(files, scan_type)

    if scan_type == "3D":
        return run_full_case_model(
            files,
            backend_public_url,
            xai_method=xai_method,
        )

    prepared = prepare_mri_scan_inputs(files)
    pipeline_result = run_pipeline(files, prepared=prepared)
    logger.info(
        "Slice filter selected %s good slices and %s bad slices using %s.",
        len(prepared.slice_filter.get("good_slices", [])),
        len(prepared.slice_filter.get("bad_slices", [])),
        prepared.slice_filter.get("reference_modality", "t1c"),
    )

    segmentation_result: SegmentationResult | None = None
    xai_result = None
    xai_error: str | None = None
    grad_cam_path = _grad_cam_path(files, backend_public_url)

    needs_segmentation = prediction_supports_segmentation(pipeline_result.prediction)
    should_run_xai = run_xai and "stage2" in pipeline_result.stages_run
    xai_job_id = uuid.uuid4().hex

    if should_run_xai and needs_segmentation and ANALYZE_PARALLEL_SEGMENTATION_AND_XAI:
        seg_job_id = uuid.uuid4().hex
        seg_output_dir = resolve_segmentation_output_dir(files, seg_job_id)

        with ThreadPoolExecutor(max_workers=2) as executor:
            xai_future = executor.submit(
                _run_cascade_xai_for_analyze,
                files,
                pipeline_result,
                xai_method=xai_method,
                backend_public_url=backend_public_url,
                xai_job_id=xai_job_id,
                prepared=prepared,
            )
            seg_future = executor.submit(
                run_segmentation,
                files,
                pipeline_result.prediction,
                seg_output_dir,
                backend_public_url,
                prepared=prepared,
            )

            xai_result, xai_error = xai_future.result()
            segmentation_result = _to_segmentation_result(seg_future.result())

    else:
        if should_run_xai:
            xai_result, xai_error = _run_cascade_xai_for_analyze(
                files,
                pipeline_result,
                xai_method=xai_method,
                backend_public_url=backend_public_url,
                xai_job_id=xai_job_id,
                prepared=prepared,
            )

        if needs_segmentation:
            seg_job_id = uuid.uuid4().hex
            output_dir = resolve_segmentation_output_dir(files, seg_job_id)
            artifacts = run_segmentation(
                files,
                pipeline_result.prediction,
                output_dir,
                backend_public_url,
                prepared=prepared,
            )
            segmentation_result = _to_segmentation_result(artifacts)

    if xai_result and xai_result.stages:
        preview = cascade_stage_preview_overlay(xai_result.stages[-1])
        if preview:
            grad_cam_path = preview

    return ModelResult(
        prediction=pipeline_result.prediction,
        confidenceScores=pipeline_result.confidence_scores,
        confidence=pipeline_result.confidence,
        gradCamPath=grad_cam_path,
        processedTime=round((time.perf_counter() - started_at) * 1000, 2),
        modelVersion=os.getenv("MODEL_VERSION", get_model_version()),
        segmentation=segmentation_result,
        xai=xai_result,
        xaiError=xai_error,
        sliceFiltering=prepared.slice_filter,
    )
