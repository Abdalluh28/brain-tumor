from __future__ import annotations

import io
import uuid
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import quote

import keras
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .config import (
    GLI_SEG_MODEL_CANDIDATES,
    IMG_HEIGHT,
    IMG_WIDTH,
    METS_SEG_MODEL_CANDIDATES,
    MODALITY_ORDER,
    NUM_SEG_CLASSES,
    SEG_CLASS_COLORS,
    SEG_CLASS_HEX,
    SEG_CLASS_NAMES,
    resolve_model_path,
)
from .inference import keras_predict_proba
from .preprocessing import load_modality_slice, map_files_to_modalities
from .scan_inputs import PreparedScanInputs
from .schemas import Prediction, ScanFileIn

SegmentationModelType = Literal["GLI", "METS"]
OVERLAY_ALPHA = 0.45


@dataclass(frozen=True)
class SegmentationClassStat:
    class_id: int
    label: str
    color_hex: str
    pixel_count: int
    percentage: float


@dataclass(frozen=True)
class SegmentationArtifacts:
    model_type: SegmentationModelType
    model_path: str
    mask_path: str
    overlay_path: str
    legend_path: str
    distribution_path: str
    class_stats: list[SegmentationClassStat]
    metadata: dict


def prediction_supports_segmentation(prediction: Prediction) -> bool:
    return prediction in ("HGG", "LGG", "Metastasis")


def segmentation_model_type(prediction: Prediction) -> SegmentationModelType | None:
    if prediction in ("HGG", "LGG"):
        return "GLI"
    if prediction == "Metastasis":
        return "METS"
    return None


def resolve_segmentation_output_dir(files: list[ScanFileIn], job_id: str | None = None) -> Path:
    first_path = Path(files[0].rawPath)
    uploads_root = first_path.parent.parent
    folder_name = job_id or uuid.uuid4().hex
    output_dir = uploads_root / "segmentation" / folder_name
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def build_public_upload_url(backend_public_url: str | None, absolute_path: Path) -> str:
    normalized = str(absolute_path).replace("\\", "/")
    marker = "/uploads/"
    if marker not in normalized:
        return normalized
    relative = normalized.split(marker, 1)[1]
    if not backend_public_url:
        return relative
    return f"{backend_public_url.rstrip('/')}/uploads/{quote(relative)}"


def normalize_percentile(image: np.ndarray) -> np.ndarray:
    array = image.astype(np.float32)
    non_zero = array[array > 0]
    if non_zero.size == 0:
        return np.zeros_like(array, dtype=np.float32)

    vmin, vmax = np.percentile(non_zero, (1, 99))
    array = np.clip(array, vmin, vmax)
    return ((array - vmin) / (vmax - vmin + 1e-8)).astype(np.float32)


def build_segmentation_input(modality_map: dict[str, ScanFileIn]) -> tuple[np.ndarray, np.ndarray]:
    channels = []
    for modality in MODALITY_ORDER:
        scan_file = modality_map[modality]
        channel = load_modality_slice(scan_file.rawPath, scan_file.format)
        channels.append(normalize_percentile(channel))

    stacked = np.stack(channels, axis=-1).astype(np.float32)
    return stacked, channels[0]


@lru_cache(maxsize=2)
def _load_segmentation_model(model_type: SegmentationModelType):
    keras.config.enable_unsafe_deserialization()
    candidates = (
        GLI_SEG_MODEL_CANDIDATES
        if model_type == "GLI"
        else METS_SEG_MODEL_CANDIDATES
    )
    path = resolve_model_path(candidates)
    return keras.models.load_model(path, compile=False), path


def predict_mask(tensor: np.ndarray, model_type: SegmentationModelType) -> np.ndarray:
    model, _ = _load_segmentation_model(model_type)
    probabilities = keras_predict_proba(model, tensor)
    return np.argmax(probabilities, axis=-1).astype(np.uint8)


def colorize_mask(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    color_mask = np.zeros((height, width, 3), dtype=np.uint8)
    for class_id, color in SEG_CLASS_COLORS.items():
        color_mask[mask == class_id] = color
    return color_mask


def overlay_mask_on_t1n(
    t1n_gray: np.ndarray,
    mask: np.ndarray,
    alpha: float = OVERLAY_ALPHA,
) -> np.ndarray:
    base = (np.clip(t1n_gray, 0.0, 1.0) * 255.0).astype(np.uint8)
    base_rgb = np.stack([base, base, base], axis=-1)
    color_mask = colorize_mask(mask)
    overlay = base_rgb.copy()

    tumor_region = mask > 0
    if np.any(tumor_region):
        overlay[tumor_region] = (
            (1.0 - alpha) * base_rgb[tumor_region] + alpha * color_mask[tumor_region]
        ).astype(np.uint8)

    return overlay


def summarize_mask(mask: np.ndarray) -> list[SegmentationClassStat]:
    total_pixels = int(mask.size)
    unique, counts = np.unique(mask, return_counts=True)
    count_map = {int(class_id): int(count) for class_id, count in zip(unique, counts)}

    stats: list[SegmentationClassStat] = []
    for class_id in range(NUM_SEG_CLASSES):
        pixel_count = count_map.get(class_id, 0)
        stats.append(
            SegmentationClassStat(
                class_id=class_id,
                label=SEG_CLASS_NAMES[class_id],
                color_hex=SEG_CLASS_HEX[class_id],
                pixel_count=pixel_count,
                percentage=round((pixel_count / total_pixels) * 100, 2) if total_pixels else 0.0,
            )
        )
    return stats


def create_legend_image() -> np.ndarray:
    width = 460
    row_height = 52
    margin = 18
    box_size = 28
    height = margin * 2 + row_height * NUM_SEG_CLASSES

    image = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(image)

    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except OSError:
        font = ImageFont.load_default()

    for index, class_id in enumerate(range(NUM_SEG_CLASSES)):
        y = margin + index * row_height
        color = SEG_CLASS_COLORS[class_id]
        label = f"{class_id}: {SEG_CLASS_NAMES[class_id]}"

        draw.rectangle(
            [margin, y, margin + box_size, y + box_size],
            fill=color,
            outline=(30, 30, 30),
        )
        draw.text((margin + box_size + 14, y + 4), label, fill=(15, 23, 42), font=font)

    return np.asarray(image)


def create_distribution_chart(stats: list[SegmentationClassStat], title: str) -> np.ndarray:
    labels = [stat.label for stat in stats]
    counts = [stat.pixel_count for stat in stats]
    colors = [stat.color_hex for stat in stats]

    fig, ax = plt.subplots(figsize=(9, 5), dpi=120)
    bars = ax.bar(labels, counts, color=colors, edgecolor="#1e293b", linewidth=0.6)
    ax.set_title(title, fontsize=13, fontweight="bold", pad=12)
    ax.set_ylabel("Pixel count", fontsize=11)
    ax.set_xlabel("Segmentation class", fontsize=11)
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.tick_params(axis="x", rotation=18)

    ymax = max(counts) if counts else 1
    ax.set_ylim(0, ymax * 1.18 if ymax > 0 else 1)

    for bar, stat in zip(bars, stats):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(ymax * 0.02, 1),
            f"{stat.pixel_count:,}\n({stat.percentage:.1f}%)",
            ha="center",
            va="bottom",
            fontsize=9,
        )

    fig.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buffer.seek(0)
    return np.asarray(Image.open(buffer).convert("RGB"))


def _save_png(array: np.ndarray, path: Path) -> None:
    Image.fromarray(array).save(path, format="PNG", optimize=True)


def run_segmentation(
    files: list[ScanFileIn],
    prediction: Prediction,
    output_dir: Path,
    backend_public_url: str | None = None,
    *,
    prepared: PreparedScanInputs | None = None,
) -> SegmentationArtifacts:
    model_type = segmentation_model_type(prediction)
    if model_type is None:
        raise ValueError(f"Segmentation is not available for prediction: {prediction}")

    if prepared is not None:
        tensor = prepared.segmentation_tensor
        t1n = prepared.t1n_gray
    else:
        modality_map = map_files_to_modalities(files)
        tensor, t1n = build_segmentation_input(modality_map)
    _, model_path = _load_segmentation_model(model_type)
    mask = predict_mask(tensor, model_type)

    color_mask = colorize_mask(mask)
    overlay = overlay_mask_on_t1n(t1n, mask)
    legend = create_legend_image()
    class_stats = summarize_mask(mask)
    distribution = create_distribution_chart(
        class_stats,
        title=f"{model_type} segmentation — class pixel distribution",
    )

    mask_file = output_dir / "mask.png"
    overlay_file = output_dir / "overlay_t1n.png"
    legend_file = output_dir / "legend.png"
    distribution_file = output_dir / "distribution.png"

    _save_png(color_mask, mask_file)
    _save_png(overlay, overlay_file)
    _save_png(legend, legend_file)
    _save_png(distribution, distribution_file)

    metadata = {
        "modelType": model_type,
        "modelFile": model_path.name,
        "imageSize": [IMG_WIDTH, IMG_HEIGHT],
        "numClasses": NUM_SEG_CLASSES,
        "classLabels": {str(k): v for k, v in SEG_CLASS_NAMES.items()},
        "classColors": {str(k): SEG_CLASS_HEX[k] for k in SEG_CLASS_NAMES},
        "totalPixels": int(mask.size),
        "tumorPixels": int(np.sum(mask > 0)),
        "tumorPercentage": round(float(np.mean(mask > 0)) * 100, 2),
    }

    return SegmentationArtifacts(
        model_type=model_type,
        model_path=str(model_path),
        mask_path=build_public_upload_url(backend_public_url, mask_file),
        overlay_path=build_public_upload_url(backend_public_url, overlay_file),
        legend_path=build_public_upload_url(backend_public_url, legend_file),
        distribution_path=build_public_upload_url(backend_public_url, distribution_file),
        class_stats=class_stats,
        metadata=metadata,
    )
