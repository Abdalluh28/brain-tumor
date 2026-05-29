import logging
import os
import time
import uuid
from pathlib import Path
from urllib.parse import quote

from .pipeline import get_model_version, run_pipeline
from .schemas import ModelResult, ScanFileIn, SegmentationClassStatOut, SegmentationResult
from .segmentation import (
    prediction_supports_segmentation,
    resolve_segmentation_output_dir,
    run_segmentation,
)
from .xai_service import cascade_stage_preview_overlay, run_cascade_xai

IMAGE_FORMATS = {"png", "jpg", "jpeg"}
VOLUME_FORMATS = {"nii", "nii.gz", "dcm"}

logger = logging.getLogger(__name__)

# Tried in order when generating cascade XAI (GLI/HGG/LGG uses stage 3 DenseNet).
CASCADE_XAI_METHODS = (
    "gradcam++",
    "gradcam",
    "vanilla_saliency",
    "integrated_gradients",
)


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


def run_model(
    files: list[ScanFileIn],
    backend_public_url: str | None = None,
    scan_type: str | None = None,
    *,
    run_xai: bool = True,
    xai_method: str = "gradcam++",
) -> ModelResult:
    started_at = time.perf_counter()

    for scan_file in files:
        if not Path(scan_file.rawPath).exists():
            raise FileNotFoundError(f"Input file not found: {scan_file.rawPath}")

    _validate_scan_type_files(files, scan_type)

    pipeline_result = run_pipeline(files)
    segmentation_result: SegmentationResult | None = None
    xai_result = None
    xai_error: str | None = None
    grad_cam_path = _grad_cam_path(files, backend_public_url)

    if run_xai:
        methods_to_try = (xai_method,) + tuple(
            m for m in CASCADE_XAI_METHODS if m != xai_method
        )
        xai_job_id = uuid.uuid4().hex

        for method in methods_to_try:
            try:
                xai_result = run_cascade_xai(
                    files,
                    pipeline_result,
                    cascade_prediction=pipeline_result.prediction,
                    xai_method=method,
                    backend_public_url=backend_public_url,
                    job_id=xai_job_id,
                )
                preview = cascade_stage_preview_overlay(xai_result.stages[-1])
                if preview:
                    grad_cam_path = preview
                xai_error = None
                if method != xai_method:
                    logger.info(
                        "Cascade XAI succeeded with fallback method '%s' "
                        "(requested '%s') for prediction %s",
                        method,
                        xai_method,
                        pipeline_result.prediction,
                    )
                break
            except Exception as exc:
                xai_error = str(exc)
                logger.warning(
                    "Cascade XAI failed for prediction %s with method '%s': %s",
                    pipeline_result.prediction,
                    method,
                    exc,
                    exc_info=True,
                )
                xai_result = None

    if prediction_supports_segmentation(pipeline_result.prediction):
        job_id = uuid.uuid4().hex
        output_dir = resolve_segmentation_output_dir(files, job_id)
        artifacts = run_segmentation(
            files,
            pipeline_result.prediction,
            output_dir,
            backend_public_url,
        )
        segmentation_result = _to_segmentation_result(artifacts)

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
    )
