import os
import time
from pathlib import Path
from urllib.parse import quote

from .pipeline import get_model_version, run_pipeline
from .schemas import ModelResult, ScanFileIn

IMAGE_FORMATS = {"png", "jpg", "jpeg"}
VOLUME_FORMATS = {"nii", "nii.gz", "dcm"}


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


def run_model(
    files: list[ScanFileIn],
    backend_public_url: str | None = None,
    scan_type: str | None = None,
) -> ModelResult:
    started_at = time.perf_counter()

    for scan_file in files:
        if not Path(scan_file.rawPath).exists():
            raise FileNotFoundError(f"Input file not found: {scan_file.rawPath}")

    _validate_scan_type_files(files, scan_type)

    pipeline_result = run_pipeline(files)

    return ModelResult(
        prediction=pipeline_result.prediction,
        confidenceScores=pipeline_result.confidence_scores,
        confidence=pipeline_result.confidence,
        gradCamPath=_grad_cam_path(files, backend_public_url),
        processedTime=round((time.perf_counter() - started_at) * 1000, 2),
        modelVersion=os.getenv("MODEL_VERSION", get_model_version()),
    )
