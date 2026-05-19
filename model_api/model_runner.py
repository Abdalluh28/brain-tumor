import hashlib
import os
import time
from pathlib import Path
from urllib.parse import quote

from .schemas import ModelResult, ScanFileIn

LABELS = ("GBM", "LGG", "Metastasis", "Healthy")
IMAGE_FORMATS = {"png", "jpg", "jpeg"}


def _file_fingerprint(files: list[ScanFileIn]) -> bytes:
    digest = hashlib.sha256()

    for scan_file in sorted(files, key=lambda item: item.rawPath):
        path = Path(scan_file.rawPath)
        digest.update(scan_file.rawPath.encode("utf-8"))
        digest.update(scan_file.format.encode("utf-8"))

        if path.exists():
            stat = path.stat()
            digest.update(str(stat.st_size).encode("utf-8"))
            digest.update(str(int(stat.st_mtime)).encode("utf-8"))

            with path.open("rb") as file:
                digest.update(file.read(1024 * 1024))

    return digest.digest()


def _scores_from_fingerprint(fingerprint: bytes) -> dict[str, float]:
    raw_scores = [fingerprint[index] + 24 for index in range(len(LABELS))]
    total = sum(raw_scores)
    scores = {
        label: round((score / total) * 100, 2)
        for label, score in zip(LABELS, raw_scores, strict=True)
    }

    delta = round(100 - sum(scores.values()), 2)
    scores["Healthy"] = round(scores["Healthy"] + delta, 2)
    return scores


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


def run_model(files: list[ScanFileIn], backend_public_url: str | None = None) -> ModelResult:
    started_at = time.perf_counter()

    for scan_file in files:
        if not Path(scan_file.rawPath).exists():
            raise FileNotFoundError(f"Input file not found: {scan_file.rawPath}")

    fingerprint = _file_fingerprint(files)
    confidence_scores = _scores_from_fingerprint(fingerprint)
    prediction = max(confidence_scores, key=confidence_scores.get)
    confidence = confidence_scores[prediction]

    return ModelResult(
        prediction=prediction,
        confidenceScores=confidence_scores,
        confidence=confidence,
        gradCamPath=_grad_cam_path(files, backend_public_url),
        processedTime=round((time.perf_counter() - started_at) * 1000, 2),
        modelVersion=os.getenv("MODEL_VERSION", "local-placeholder-v1"),
    )
