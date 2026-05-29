#!/usr/bin/env python3
"""
Kaggle notebook script: benchmark permutation XAI (PCI, occlusion, SHAP)
with hyperparameter cross-validation and method comparison.

Copy this entire file into a Kaggle notebook cell (or upload as .py) and edit
the CONFIG section below.

Suggested Kaggle setup:
  !pip install -q shap
  Add your stage-2 .keras model as a Kaggle dataset.
  Add 4 MRI files per test case (t1n, t1c, t2w, t2f) — PNG/JPG recommended.

Metrics:
  - Cross-validation picks best params per method (leave-one-case-out).
  - Fidelity score: drop in target-class score after masking the top-ranked channel.
  - Method comparison: Spearman rank correlation of channel importances + runtime.

Visual outputs (under OUTPUT_DIR/visuals/<case>/<method>/):
  - Per modality: original.png, heatmap.png, overlay.png
  - Combined: combined/prediction_heatmap.png, combined/prediction_overlay.png
  - Previews: OUTPUT_DIR/previews/<case>/*_per_modality.png, *_prediction.png
"""

from __future__ import annotations

import itertools
import json
import time
import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import numpy as np

# ---------------------------------------------------------------------------
# CONFIG — edit for Kaggle
# ---------------------------------------------------------------------------

IMG_HEIGHT = 240
IMG_WIDTH = 240
MODALITY_ORDER = ["t1n", "t1c", "t2w", "t2f"]
STAGE2_LABELS = ("GLI", "METS", "OTHER")

# Path to EfficientNet stage-2 weights (Kaggle dataset path)
MODEL_PATH = "/kaggle/input/your-model-dataset/model.keras"

# Inference batch size (increase on GPU)
INFERENCE_BATCH_SIZE = 64

# Each case: 4 modality paths + optional label / class index
# class_index: 0=GLI, 1=METS, 2=OTHER (None = use model argmax)
TEST_CASES: list[dict[str, Any]] = [
    {
        "name": "case_01",
        "paths": {
            "t1n": "/kaggle/input/your-images/case01_t1n.png",
            "t1c": "/kaggle/input/your-images/case01_t1c.png",
            "t2w": "/kaggle/input/your-images/case01_t2w.png",
            "t2f": "/kaggle/input/your-images/case01_t2f.png",
        },
        "class_index": None,
    },
    {
        "name": "case_02",
        "paths": {
            "t1n": "/kaggle/input/your-images/case02_t1n.png",
            "t1c": "/kaggle/input/your-images/case02_t1c.png",
            "t2w": "/kaggle/input/your-images/case02_t2w.png",
            "t2f": "/kaggle/input/your-images/case02_t2f.png",
        },
        "class_index": 0,
    },
]

# Hyperparameter grids (keep small on Kaggle; expand when you have GPU time)
PCI_PARAM_GRID: list[dict[str, int]] = [
    {"grid_rows": 4, "grid_cols": 4, "permutations_per_cell": 1},
    {"grid_rows": 6, "grid_cols": 6, "permutations_per_cell": 1},
    {"grid_rows": 8, "grid_cols": 8, "permutations_per_cell": 1},
    {"grid_rows": 8, "grid_cols": 8, "permutations_per_cell": 2},
]

OCCLUSION_PARAM_GRID: list[dict[str, int]] = [
    {"patch_size": 32, "stride": 16},
    {"patch_size": 40, "stride": 20},
    {"patch_size": 48, "stride": 24},
]

SHAP_PARAM_GRID: list[dict[str, int]] = [
    {"background_samples": 4},
    {"background_samples": 8},
    {"background_samples": 16},
]

OUTPUT_DIR = Path("/kaggle/working/permutation_xai_benchmark")
SAVE_HEATMAP_PREVIEWS = True
SAVE_VISUAL_OUTPUTS = True
EXPORT_ZIP_AT_END = True
# Background MRI for combined prediction heatmap / overlay
DISPLAY_MODALITY = "t1c"
OVERLAY_ALPHA = 0.45
RANDOM_SEED = 42
# SHAP: pass Keras model to explainer (not a Python function). Falls back to occlusion if needed.
ENABLE_SHAP = True
SHAP_OCCLUSION_FALLBACK_PARAMS = {"patch_size": 40, "stride": 20}

# Jet-style colormap (matches production XAI)
_HEATMAP_COLORS = np.array(
    [
        [0, 0, 128],
        [0, 0, 255],
        [0, 255, 255],
        [0, 255, 0],
        [255, 255, 0],
        [255, 0, 0],
        [128, 0, 0],
    ],
    dtype=np.float32,
)

PermutationMethod = Literal["pci", "occlusion", "shap"]

# ---------------------------------------------------------------------------
# TensorFlow / model
# ---------------------------------------------------------------------------


def configure_tensorflow() -> None:
    import os

    import tensorflow as tf

    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    gpus = tf.config.list_physical_devices("GPU")
    for gpu in gpus:
        try:
            tf.config.experimental.set_memory_growth(gpu, True)
        except Exception:
            pass


def load_stage2_model(model_path: str):
    import keras
    import tensorflow as tf
    from tensorflow.keras.applications.efficientnet import preprocess_input

    configure_tensorflow()
    keras.config.enable_unsafe_deserialization()
    model = keras.models.load_model(
        model_path,
        compile=False,
        custom_objects={"preprocess_input": preprocess_input},
    )
    print(f"Loaded model: {model_path}")
    print(f"GPU available: {bool(tf.config.list_physical_devices('GPU'))}")
    return model


def load_png_grayscale(path: str) -> np.ndarray:
    from PIL import Image

    image = Image.open(path).convert("L").resize((IMG_WIDTH, IMG_HEIGHT))
    return np.asarray(image, dtype=np.float32) / 255.0


def build_batch(case: dict[str, Any]) -> np.ndarray:
    channels = []
    for mod in MODALITY_ORDER:
        p = case["paths"][mod]
        if not Path(p).exists():
            raise FileNotFoundError(f"Missing {mod}: {p}")
        channels.append(load_png_grayscale(p))
    tensor = np.stack(channels, axis=-1).astype(np.float32)
    return tensor[np.newaxis, ...]


def predict_class_index(model, batch: np.ndarray) -> tuple[int, np.ndarray]:
    import tensorflow as tf

    preds = model(tf.constant(batch, dtype=tf.float32), training=False).numpy()[0]
    return int(np.argmax(preds)), preds


def target_score(model, batch: np.ndarray, class_index: int) -> float:
    import tensorflow as tf

    preds = model(tf.constant(batch, dtype=tf.float32), training=False).numpy()[0]
    if len(preds) == 1:
        return float(preds[0])
    return float(preds[class_index])


def batched_target_scores(
    model,
    inputs: np.ndarray,
    class_index: int,
    batch_size: int = INFERENCE_BATCH_SIZE,
) -> np.ndarray:
    import tensorflow as tf

    total = inputs.shape[0]
    scores = np.empty(total, dtype=np.float32)
    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        chunk = tf.constant(inputs[start:end], dtype=tf.float32)
        preds = model(chunk, training=False).numpy()
        if preds.shape[-1] == 1:
            scores[start:end] = preds[:, 0]
        else:
            scores[start:end] = preds[:, class_index]
    return scores


def normalize_heatmap(heatmap: np.ndarray) -> np.ndarray:
    heatmap = heatmap.astype(np.float32)
    minimum = float(heatmap.min())
    maximum = float(heatmap.max())
    if maximum <= minimum:
        return np.zeros_like(heatmap)
    return (heatmap - minimum) / (maximum - minimum)


def normalize_importances(raw: list[float], n: int) -> list[float]:
    total = float(sum(raw))
    if total > 1e-12:
        return [v / total for v in raw]
    return [1.0 / n] * n


# ---------------------------------------------------------------------------
# Parameterized permutation XAI (mirrors model_api/xai/channel_attribution.py)
# ---------------------------------------------------------------------------


@dataclass
class PciParams:
    grid_rows: int = 8
    grid_cols: int = 8
    permutations_per_cell: int = 2


@dataclass
class OcclusionParams:
    patch_size: int = 40
    stride: int = 20


@dataclass
class ShapParams:
    background_samples: int = 8


@dataclass
class XaiRunResult:
    method: str
    params: dict[str, Any]
    importances: dict[str, float]
    importances_raw: dict[str, float]
    heatmaps: list[np.ndarray]
    runtime_sec: float
    metadata: dict[str, Any] = field(default_factory=dict)


def _grid_cell_bounds(
    row_idx: int,
    col_idx: int,
    *,
    grid_rows: int,
    grid_cols: int,
) -> tuple[int, int, int, int]:
    cell_h = max(1, IMG_HEIGHT // grid_rows)
    cell_w = max(1, IMG_WIDTH // grid_cols)
    row_start = row_idx * cell_h
    col_start = col_idx * cell_w
    row_end = min(row_start + cell_h, IMG_HEIGHT)
    col_end = min(col_start + cell_w, IMG_WIDTH)
    return row_start, row_end, col_start, col_end


def run_pci(
    model,
    batch: np.ndarray,
    class_index: int,
    params: PciParams,
) -> tuple[list[np.ndarray], list[float]]:
    base_np = batch.copy()
    baseline = target_score(model, base_np, class_index)
    num_channels = base_np.shape[-1]
    heatmaps: list[np.ndarray] = []
    importances: list[float] = []

    for channel_index in range(num_channels):
        stacks: list[np.ndarray] = []
        meta: list[tuple[int, int, int, int, int, int]] = []

        for row_idx in range(params.grid_rows):
            for col_idx in range(params.grid_cols):
                row_start, row_end, col_start, col_end = _grid_cell_bounds(
                    row_idx,
                    col_idx,
                    grid_rows=params.grid_rows,
                    grid_cols=params.grid_cols,
                )
                for perm_idx in range(params.permutations_per_cell):
                    permuted = base_np.copy()
                    cell = permuted[0, row_start:row_end, col_start:col_end, channel_index].reshape(
                        -1
                    )
                    rng = np.random.default_rng(
                        class_index * 1000
                        + channel_index * 100
                        + row_idx * 10
                        + col_idx
                        + perm_idx
                    )
                    rng.shuffle(cell)
                    permuted[0, row_start:row_end, col_start:col_end, channel_index] = cell.reshape(
                        row_end - row_start, col_end - col_start
                    )
                    stacks.append(permuted[0])
                    meta.append((row_idx, col_idx, row_start, row_end, col_start, col_end))

        stack = np.stack(stacks, axis=0).astype(np.float32)
        scores = batched_target_scores(model, stack, class_index)
        drops = np.abs(baseline - scores)
        per_cell = params.permutations_per_cell
        num_cells = len(meta) // per_cell
        heatmap = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)

        for cell_index in range(num_cells):
            _r, _c, row_start, row_end, col_start, col_end = meta[cell_index * per_cell]
            cell_drops = drops[cell_index * per_cell : (cell_index + 1) * per_cell]
            cell_value = float(np.mean(cell_drops)) if len(cell_drops) else 0.0
            heatmap[row_start:row_end, col_start:col_end] = cell_value

        heatmaps.append(normalize_heatmap(heatmap))
        importances.append(float(np.mean(drops)) if len(drops) else 0.0)

    return heatmaps, importances


def run_occlusion(
    model,
    batch: np.ndarray,
    class_index: int,
    params: OcclusionParams,
) -> tuple[list[np.ndarray], list[float]]:
    base_np = batch.copy()
    baseline = target_score(model, base_np, class_index)
    num_channels = base_np.shape[-1]
    patch = params.patch_size
    stride = params.stride
    heatmaps: list[np.ndarray] = []
    importances: list[float] = []

    for channel_index in range(num_channels):
        fill_value = float(np.mean(base_np[0, :, :, channel_index]))
        stacks: list[np.ndarray] = []
        positions: list[tuple[int, int]] = []

        for row in range(0, IMG_HEIGHT - patch + 1, stride):
            for col in range(0, IMG_WIDTH - patch + 1, stride):
                occluded = base_np.copy()
                occluded[0, row : row + patch, col : col + patch, channel_index] = fill_value
                stacks.append(occluded[0])
                positions.append((row, col))

        if not stacks:
            heatmaps.append(np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32))
            importances.append(0.0)
            continue

        stack = np.stack(stacks, axis=0).astype(np.float32)
        scores = batched_target_scores(model, stack, class_index)
        drops = np.abs(baseline - scores)

        heatmap = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)
        counts = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)
        for (row, col), drop in zip(positions, drops, strict=True):
            heatmap[row : row + patch, col : col + patch] += drop
            counts[row : row + patch, col : col + patch] += 1.0
        heatmap /= np.maximum(counts, 1.0)
        heatmaps.append(normalize_heatmap(heatmap))
        importances.append(float(np.mean(drops)))

    return heatmaps, importances


def _select_shap_values_for_class(shap_values: Any, class_index: int) -> np.ndarray:
    """Pick attribution tensor for the explained class from SHAP return values."""
    if isinstance(shap_values, list):
        if len(shap_values) == 1:
            shap_values = shap_values[0]
        elif class_index < len(shap_values):
            shap_values = shap_values[class_index]
        else:
            shap_values = shap_values[0]

    shap_values = np.asarray(shap_values, dtype=np.float32)
    if shap_values.ndim == 4 and shap_values.shape[0] == 1:
        shap_values = shap_values[0]
    if shap_values.ndim != 3:
        raise ValueError(f"Unexpected SHAP shape after class selection: {shap_values.shape}")
    return shap_values


def run_shap(
    model,
    batch: np.ndarray,
    class_index: int,
    params: ShapParams,
) -> tuple[list[np.ndarray], list[float], str]:
    """
    SHAP channel attributions. Uses the Keras model object (required by SHAP >= 0.40).
    Falls back to DeepExplainer, then occlusion if both fail.
    """
    try:
        import shap
    except ImportError as exc:
        raise RuntimeError("Install shap: pip install shap") from exc

    input_np = batch.astype(np.float32)
    n_bg = max(2, params.background_samples)
    background = np.repeat(input_np, n_bg, axis=0)
    rng = np.random.default_rng(RANDOM_SEED)
    background += rng.normal(0, 0.02, background.shape).astype(np.float32)
    background = np.clip(background, 0.0, 1.0)

    shap_values = None
    backend = "shap_gradient"
    last_error: Exception | None = None

    # SHAP expects a model object, not a bare @tf.function / Python callable.
    for explainer_name, factory in (
        ("shap_gradient", lambda: shap.GradientExplainer(model, background)),
        ("shap_deep", lambda: shap.DeepExplainer(model, background)),
    ):
        try:
            explainer = factory()
            shap_values = explainer.shap_values(input_np)
            backend = explainer_name
            break
        except Exception as exc:
            last_error = exc
            continue

    if shap_values is None:
        warnings.warn(
            f"SHAP explainers failed ({last_error}). Using occlusion fallback."
        )
        occ = OcclusionParams(**SHAP_OCCLUSION_FALLBACK_PARAMS)
        heatmaps, raw = run_occlusion(model, batch, class_index, occ)
        return heatmaps, raw, "shap_occlusion_fallback"

    shap_values = _select_shap_values_for_class(shap_values, class_index)
    num_channels = batch.shape[-1]
    if shap_values.shape[-1] != num_channels:
        raise ValueError(
            f"SHAP channels {shap_values.shape[-1]} != input channels {num_channels}"
        )

    heatmaps = []
    raw = []
    for channel_index in range(num_channels):
        channel_attr = np.abs(shap_values[:, :, channel_index])
        heatmaps.append(normalize_heatmap(channel_attr))
        raw.append(float(np.mean(channel_attr)))
    return heatmaps, raw, backend


def run_method(
    model,
    batch: np.ndarray,
    class_index: int,
    method: PermutationMethod,
    params: dict[str, Any],
) -> XaiRunResult:
    t0 = time.perf_counter()
    meta: dict[str, Any] = {"method": method, "params": params}

    if method == "pci":
        p = PciParams(**params)
        heatmaps, raw = run_pci(model, batch, class_index, p)
    elif method == "occlusion":
        p = OcclusionParams(**params)
        heatmaps, raw = run_occlusion(model, batch, class_index, p)
    elif method == "shap":
        p = ShapParams(**params)
        heatmaps, raw, backend = run_shap(model, batch, class_index, p)
        meta["shap_backend"] = backend
    else:
        raise ValueError(method)

    normalized = normalize_importances(raw, len(MODALITY_ORDER))
    imp = {m: normalized[i] for i, m in enumerate(MODALITY_ORDER)}
    imp_raw = {m: float(raw[i]) for i, m in enumerate(MODALITY_ORDER)}

    return XaiRunResult(
        method=method,
        params=params,
        importances=imp,
        importances_raw=imp_raw,
        heatmaps=heatmaps,
        runtime_sec=time.perf_counter() - t0,
        metadata=meta,
    )


# ---------------------------------------------------------------------------
# Heatmap / overlay export (PNG files)
# ---------------------------------------------------------------------------


def grayscale_to_uint8(grayscale: np.ndarray) -> np.ndarray:
    return (np.clip(grayscale, 0.0, 1.0) * 255.0).astype(np.uint8)


def heatmap_to_rgb(heatmap: np.ndarray) -> np.ndarray:
    heat = np.clip(heatmap, 0.0, 1.0)
    scaled = heat * (_HEATMAP_COLORS.shape[0] - 1)
    lower = np.floor(scaled).astype(np.int32)
    upper = np.ceil(scaled).astype(np.int32)
    upper = np.clip(upper, 0, _HEATMAP_COLORS.shape[0] - 1)
    lower = np.clip(lower, 0, _HEATMAP_COLORS.shape[0] - 1)
    weight = (scaled - lower)[..., np.newaxis]
    colors = (
        _HEATMAP_COLORS[lower] * (1.0 - weight)
        + _HEATMAP_COLORS[upper] * weight
    )
    return np.clip(colors, 0, 255).astype(np.uint8)


def blend_overlay(
    grayscale: np.ndarray,
    heatmap: np.ndarray,
    alpha: float = OVERLAY_ALPHA,
) -> np.ndarray:
    base = grayscale_to_uint8(grayscale)
    base_rgb = np.stack([base, base, base], axis=-1)
    heat_rgb = heatmap_to_rgb(heatmap)
    blended = (1.0 - alpha) * base_rgb.astype(np.float32) + alpha * heat_rgb.astype(
        np.float32
    )
    return np.clip(blended, 0, 255).astype(np.uint8)


def save_png(array: np.ndarray, path: Path) -> None:
    from PIL import Image

    path.parent.mkdir(parents=True, exist_ok=True)
    if array.ndim == 2:
        Image.fromarray(grayscale_to_uint8(array)).save(path, format="PNG")
    else:
        Image.fromarray(array.astype(np.uint8)).save(path, format="PNG")


def modality_channel_index(modality: str) -> int:
    try:
        return MODALITY_ORDER.index(modality)
    except ValueError as exc:
        raise ValueError(f"Unknown modality: {modality}") from exc


def extract_grayscale_channel(batch: np.ndarray, modality: str) -> np.ndarray:
    idx = modality_channel_index(modality)
    return np.clip(batch[0, :, :, idx], 0.0, 1.0).astype(np.float32)


def build_combined_prediction_heatmap(
    heatmaps: list[np.ndarray],
    importances: dict[str, float],
) -> np.ndarray:
    """Importance-weighted merge of per-channel maps (single prediction view)."""
    combined = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)
    for modality, heatmap in zip(MODALITY_ORDER, heatmaps, strict=True):
        combined += heatmap.astype(np.float32) * float(importances[modality])
    return normalize_heatmap(combined)


def save_method_visual_outputs(
    case_name: str,
    method: str,
    result: XaiRunResult,
    batch: np.ndarray,
) -> dict[str, Any]:
    """
    Write original, colored heatmap, and overlay PNGs per modality plus a
    combined prediction heatmap/overlay on DISPLAY_MODALITY.
    """
    if not SAVE_VISUAL_OUTPUTS:
        return {}

    base_dir = OUTPUT_DIR / "visuals" / case_name / method
    paths: dict[str, Any] = {"modalities": {}, "combined": {}}

    for modality, heatmap in zip(MODALITY_ORDER, result.heatmaps, strict=True):
        mod_dir = base_dir / modality
        grayscale = extract_grayscale_channel(batch, modality)
        heatmap_rgb = heatmap_to_rgb(heatmap)
        overlay_rgb = blend_overlay(grayscale, heatmap, alpha=OVERLAY_ALPHA)

        original_path = mod_dir / "original.png"
        heatmap_path = mod_dir / "heatmap.png"
        overlay_path = mod_dir / "overlay.png"

        save_png(grayscale, original_path)
        save_png(heatmap_rgb, heatmap_path)
        save_png(overlay_rgb, overlay_path)

        paths["modalities"][modality] = {
            "original": str(original_path),
            "heatmap": str(heatmap_path),
            "overlay": str(overlay_path),
            "importance_percent": round(result.importances[modality] * 100.0, 2),
        }

    combined = build_combined_prediction_heatmap(result.heatmaps, result.importances)
    display_gray = extract_grayscale_channel(batch, DISPLAY_MODALITY)
    combined_rgb = heatmap_to_rgb(combined)
    combined_overlay = blend_overlay(display_gray, combined, alpha=OVERLAY_ALPHA)

    combined_dir = base_dir / "combined"
    combined_heatmap_path = combined_dir / "prediction_heatmap.png"
    combined_overlay_path = combined_dir / "prediction_overlay.png"
    combined_display_path = combined_dir / f"display_{DISPLAY_MODALITY}.png"

    save_png(combined_rgb, combined_heatmap_path)
    save_png(combined_overlay, combined_overlay_path)
    save_png(display_gray, combined_display_path)

    paths["combined"] = {
        "display_modality": DISPLAY_MODALITY,
        "heatmap": str(combined_heatmap_path),
        "overlay": str(combined_overlay_path),
        "display_mri": str(combined_display_path),
    }
    return paths


def save_case_prediction_summary(
    case_name: str,
    class_index: int,
    pred_label: str,
    probabilities: dict[str, float],
) -> str:
    summary_path = OUTPUT_DIR / "visuals" / case_name / "prediction.json"
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "predicted_label": pred_label,
        "class_index": class_index,
        "probabilities": probabilities,
        "display_modality_for_combined_overlay": DISPLAY_MODALITY,
    }
    with summary_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return str(summary_path)


# ---------------------------------------------------------------------------
# Evaluation & cross-validation
# ---------------------------------------------------------------------------


def importance_vector(result: XaiRunResult) -> np.ndarray:
    return np.array([result.importances[m] for m in MODALITY_ORDER], dtype=np.float64)


def spearman_rho(a: np.ndarray, b: np.ndarray) -> float:
    """Rank correlation without scipy."""
    if a.size != b.size or a.size < 2:
        return float("nan")

    def ranks(x: np.ndarray) -> np.ndarray:
        order = np.argsort(x)
        r = np.empty_like(x, dtype=np.float64)
        r[order] = np.arange(1, len(x) + 1, dtype=np.float64)
        return r

    ra, rb = ranks(a), ranks(b)
    ra -= ra.mean()
    rb -= rb.mean()
    denom = np.sqrt((ra**2).sum() * (rb**2).sum())
    if denom < 1e-12:
        return float("nan")
    return float((ra * rb).sum() / denom)


def top_channel_deletion_fidelity(
    model,
    batch: np.ndarray,
    class_index: int,
    importances: dict[str, float],
) -> float:
    """
    Higher = masking the top-ranked channel drops the target score more.
    Used as CV objective for hyperparameters.
    """
    baseline = target_score(model, batch, class_index)
    top_mod = max(importances, key=importances.get)
    top_idx = MODALITY_ORDER.index(top_mod)
    masked = batch.copy()
    masked[0, :, :, top_idx] = float(np.mean(batch[0, :, :, top_idx]))
    after = target_score(model, masked, class_index)
    return max(0.0, baseline - after)


def leave_one_out_cv(
    model,
    cases: list[dict[str, Any]],
    method: PermutationMethod,
    param_grid: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """
    For each param set, average fidelity on held-out cases.
    Returns best params + full CV table.
    """
    n = len(cases)
    if n < 2:
        warnings.warn(
            f"Only {n} test case(s): CV needs >=2 cases. "
            "Using in-sample fidelity instead (optimistic)."
        )

    rows: list[dict[str, Any]] = []
    best_mean = float("-inf")
    best_params: dict[str, Any] = param_grid[0]

    for params in param_grid:
        fold_scores: list[float] = []
        fold_times: list[float] = []

        for holdout in range(n):
            case = cases[holdout]
            batch = build_batch(case)
            class_index = case.get("class_index")
            if class_index is None:
                class_index, _ = predict_class_index(model, batch)

            try:
                result = run_method(model, batch, class_index, method, params)
                fidelity = top_channel_deletion_fidelity(
                    model, batch, class_index, result.importances
                )
                fold_scores.append(fidelity)
                fold_times.append(result.runtime_sec)
            except Exception as exc:
                fold_scores.append(float("nan"))
                fold_times.append(float("nan"))
                rows.append(
                    {
                        "method": method,
                        "params": params,
                        "holdout_case": case["name"],
                        "fidelity": None,
                        "runtime_sec": None,
                        "error": str(exc),
                    }
                )
                continue

            rows.append(
                {
                    "method": method,
                    "params": params,
                    "holdout_case": case["name"],
                    "fidelity": fidelity,
                    "runtime_sec": result.runtime_sec,
                    "importances": result.importances,
                    "error": None,
                }
            )

        valid = [s for s in fold_scores if not np.isnan(s)]
        mean_fidelity = float(np.mean(valid)) if valid else float("nan")
        mean_time = (
            float(np.mean([t for t in fold_times if not np.isnan(t)]))
            if any(not np.isnan(t) for t in fold_times)
            else float("nan")
        )

        summary = {
            "method": method,
            "params": params,
            "mean_fidelity": mean_fidelity,
            "mean_runtime_sec": mean_time,
            "n_folds": len(valid),
        }
        rows.append({**summary, "row_type": "param_summary"})

        if valid and not np.isnan(mean_fidelity) and mean_fidelity > best_mean:
            best_mean = mean_fidelity
            best_params = params

    fidelity_msg = (
        f"{best_mean:.6f}" if np.isfinite(best_mean) and best_mean > float("-inf") else "n/a"
    )
    print(f"\n[{method}] best params (LOO-CV): {best_params}  mean_fidelity={fidelity_msg}")
    return best_params, rows


def compare_methods(
    model,
    cases: list[dict[str, Any]],
    best_params: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Run each method with tuned params on all cases; pairwise Spearman + table."""
    per_case: list[dict[str, Any]] = []
    method_vectors: dict[str, list[np.ndarray]] = {
        m: [] for m in best_params
    }

    for case in cases:
        batch = build_batch(case)
        class_index = case.get("class_index")
        if class_index is None:
            class_index, probs = predict_class_index(model, batch)
            pred_label = STAGE2_LABELS[class_index]
        else:
            _, probs = predict_class_index(model, batch)
            pred_label = STAGE2_LABELS[class_index]

        probabilities = {
            STAGE2_LABELS[i]: float(probs[i]) for i in range(len(STAGE2_LABELS))
        }
        prediction_json = save_case_prediction_summary(
            case["name"],
            class_index,
            pred_label,
            probabilities,
        )

        case_entry: dict[str, Any] = {
            "name": case["name"],
            "class_index": class_index,
            "predicted_label": pred_label,
            "probabilities": probabilities,
            "prediction_summary_path": prediction_json,
            "methods": {},
        }

        for method, params in best_params.items():
            result = run_method(model, batch, class_index, method, params)  # type: ignore[arg-type]
            fidelity = top_channel_deletion_fidelity(
                model, batch, class_index, result.importances
            )
            visual_paths = save_method_visual_outputs(
                case["name"],
                method,
                result,
                batch,
            )
            method_payload: dict[str, Any] = {
                "importances_percent": {
                    k: round(v * 100.0, 2) for k, v in result.importances.items()
                },
                "fidelity": round(fidelity, 6),
                "runtime_sec": round(result.runtime_sec, 2),
                "params": params,
                "outputs": visual_paths,
            }
            if method == "shap":
                method_payload["shap_backend"] = result.metadata.get("shap_backend")
            case_entry["methods"][method] = method_payload
            method_vectors[method].append(importance_vector(result))

            if SAVE_HEATMAP_PREVIEWS:
                _save_case_previews(case["name"], method, result, batch)

        per_case.append(case_entry)

    methods = list(best_params.keys())
    rho_matrix = {m1: {} for m1 in methods}
    for m1, m2 in itertools.combinations(methods, 2):
        rhos = []
        for v1, v2 in zip(method_vectors[m1], method_vectors[m2], strict=True):
            rhos.append(spearman_rho(v1, v2))
        mean_rho = float(np.nanmean(rhos)) if rhos else float("nan")
        rho_matrix[m1][m2] = round(mean_rho, 4)
        rho_matrix.setdefault(m2, {})[m1] = round(mean_rho, 4)

    return {"per_case": per_case, "spearman_mean_between_methods": rho_matrix}


def _save_case_previews(
    case_name: str,
    method: str,
    result: XaiRunResult,
    batch: np.ndarray,
) -> None:
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return

    out = OUTPUT_DIR / "previews" / case_name
    out.mkdir(parents=True, exist_ok=True)

    # Per-modality: original | heatmap | overlay
    n_mod = len(MODALITY_ORDER)
    fig, axes = plt.subplots(n_mod, 3, figsize=(9, 3.2 * n_mod))
    if n_mod == 1:
        axes = np.expand_dims(axes, axis=0)

    for row, mod in enumerate(MODALITY_ORDER):
        gray = extract_grayscale_channel(batch, mod)
        hm = result.heatmaps[row]
        overlay = blend_overlay(gray, hm, alpha=OVERLAY_ALPHA)
        axes[row, 0].imshow(gray, cmap="gray")
        axes[row, 0].set_ylabel(mod)
        axes[row, 0].set_title("MRI")
        axes[row, 1].imshow(heatmap_to_rgb(hm))
        axes[row, 1].set_title("Heatmap")
        axes[row, 2].imshow(overlay)
        pct = result.importances[mod] * 100.0
        axes[row, 2].set_title(f"Overlay ({pct:.1f}%)")
        for col in range(3):
            axes[row, col].axis("off")

    fig.suptitle(f"{case_name} — {method} (per sequence)")
    fig.tight_layout()
    fig.savefig(out / f"{method}_per_modality.png", dpi=120, bbox_inches="tight")
    plt.close(fig)

    # Combined prediction view
    combined = build_combined_prediction_heatmap(result.heatmaps, result.importances)
    display_gray = extract_grayscale_channel(batch, DISPLAY_MODALITY)
    combined_overlay = blend_overlay(display_gray, combined, alpha=OVERLAY_ALPHA)

    fig2, axes2 = plt.subplots(1, 3, figsize=(12, 4))
    axes2[0].imshow(display_gray, cmap="gray")
    axes2[0].set_title(f"MRI ({DISPLAY_MODALITY})")
    axes2[1].imshow(heatmap_to_rgb(combined))
    axes2[1].set_title("Prediction heatmap")
    axes2[2].imshow(combined_overlay)
    axes2[2].set_title("Prediction overlay")
    for ax in axes2:
        ax.axis("off")
    fig2.suptitle(f"{case_name} — {method} (combined)")
    fig2.tight_layout()
    fig2.savefig(out / f"{method}_prediction.png", dpi=120, bbox_inches="tight")
    plt.close(fig2)


def print_comparison_table(comparison: dict[str, Any]) -> None:
    print("\n" + "=" * 72)
    print("PER-CASE CHANNEL IMPORTANCE (% of total)")
    print("=" * 72)
    for case in comparison["per_case"]:
        print(f"\n--- {case['name']}  (class={case['predicted_label']}) ---")
        header = f"{'modality':8}" + "".join(f"{m:>14}" for m in case["methods"])
        print(header)
        for mod in MODALITY_ORDER:
            row = f"{mod:8}"
            for method in case["methods"]:
                pct = case["methods"][method]["importances_percent"][mod]
                row += f"{pct:13.1f}%"
            print(row)
        print(
            "fidelity "
            + " ".join(
                f"{m}={case['methods'][m]['fidelity']:.4f}"
                for m in case["methods"]
            )
        )
        print(
            "time(s)  "
            + " ".join(
                f"{m}={case['methods'][m]['runtime_sec']:.1f}"
                for m in case["methods"]
            )
        )

    print("\n" + "=" * 72)
    print("MEAN SPEARMAN RANK CORRELATION (channel importances)")
    print("=" * 72)
    rho = comparison["spearman_mean_between_methods"]
    for m1 in rho:
        for m2, val in rho[m1].items():
            if m1 < m2:
                print(f"  {m1} vs {m2}: {val}")


def export_results_zip(
    output_dir: Path | str | None = None,
    zip_path: Path | str | None = None,
) -> Path:
    """Zip all benchmark outputs for download from Kaggle."""
    import shutil

    output_dir = Path(output_dir or OUTPUT_DIR)
    if not output_dir.exists():
        raise FileNotFoundError(f"Output folder not found: {output_dir}")

    if zip_path is None:
        zip_base = output_dir.parent / f"{output_dir.name}_results"
    else:
        zip_base = Path(zip_path)
        if zip_base.suffix.lower() == ".zip":
            zip_base = zip_base.with_suffix("")

    archive = shutil.make_archive(str(zip_base), "zip", root_dir=str(output_dir))
    archive_path = Path(archive)
    print(f"Created zip: {archive_path} ({archive_path.stat().st_size / 1e6:.2f} MB)")
    return archive_path


def display_benchmark_results(
    output_dir: Path | str | None = None,
    comparison: dict[str, Any] | None = None,
    methods: tuple[str, ...] | None = None,
) -> None:
    """
    Show prediction overlays in a Jupyter / Kaggle notebook.

    Usage (new cell after main()):
        from pathlib import Path
        display_benchmark_results()
    """
    try:
        from IPython.display import HTML, Image as IPyImage, display
    except ImportError as exc:
        raise RuntimeError(
            "display_benchmark_results() needs IPython (Kaggle/Jupyter)."
        ) from exc

    output_dir = Path(output_dir or OUTPUT_DIR)
    methods = methods or ("pci", "occlusion", "shap")

    if comparison is None:
        comp_path = output_dir / "method_comparison.json"
        if not comp_path.exists():
            raise FileNotFoundError(
                f"No comparison JSON at {comp_path}. Run main() first."
            )
        comparison = json.loads(comp_path.read_text(encoding="utf-8"))

    display(HTML("<h2>XAI benchmark results</h2>"))

    for case in comparison.get("per_case", []):
        case_name = case["name"]
        display(
            HTML(
                f"<h3>{case_name}</h3>"
                f"<p><b>Prediction:</b> {case['predicted_label']} "
                f"({case['probabilities']})</p>"
            )
        )

        pred_json = output_dir / "visuals" / case_name / "prediction.json"
        if pred_json.exists():
            display(HTML(f"<small>{pred_json}</small>"))

        for method in methods:
            if method not in case.get("methods", {}):
                continue

            method_info = case["methods"][method]
            extra = ""
            if method == "shap" and method_info.get("shap_backend"):
                extra = f" backend={method_info['shap_backend']}"
            display(
                HTML(
                    f"<h4>{method.upper()}</h4>"
                    f"<p>params={method_info.get('params')}{extra}</p>"
                )
            )

            combined_overlay = (
                output_dir
                / "visuals"
                / case_name
                / method
                / "combined"
                / "prediction_overlay.png"
            )
            combined_heatmap = (
                output_dir
                / "visuals"
                / case_name
                / method
                / "combined"
                / "prediction_heatmap.png"
            )
            preview_pred = output_dir / "previews" / case_name / f"{method}_prediction.png"

            if combined_overlay.exists():
                display(
                    HTML(
                        f"<p><b>{method}</b> — combined prediction overlay "
                        f"(fidelity={method_info.get('fidelity')})</p>"
                    )
                )
                display(IPyImage(filename=str(combined_overlay)))
            elif preview_pred.exists():
                display(IPyImage(filename=str(preview_pred)))

            if combined_heatmap.exists():
                display(HTML("<p>Combined heatmap</p>"))
                display(IPyImage(filename=str(combined_heatmap)))

            # One row per modality: overlay thumbnails
            mod_paths = method_info.get("outputs", {}).get("modalities", {})
            if mod_paths:
                html = "<table><tr>"
                for mod in MODALITY_ORDER:
                    overlay_p = mod_paths.get(mod, {}).get("overlay")
                    if overlay_p and Path(overlay_p).exists():
                        html += (
                            f"<td style='text-align:center'>"
                            f"<div>{mod}</div>"
                            f"<img src='{overlay_p}' width='180'/>"
                            f"</td>"
                        )
                html += "</tr></table>"
                display(HTML(html))

        display(HTML("<hr/>"))

    display(HTML("<h3>Preview grids (if generated)</h3>"))
    preview_dir = output_dir / "previews"
    if preview_dir.exists():
        for png in sorted(preview_dir.rglob("*.png")):
            display(HTML(f"<p>{png.relative_to(output_dir)}</p>"))
            display(IPyImage(filename=str(png)))


def main() -> dict[str, Any]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    np.random.seed(RANDOM_SEED)

    if not Path(MODEL_PATH).exists():
        raise FileNotFoundError(
            f"MODEL_PATH not found: {MODEL_PATH}\n"
            "Attach your .keras file as a Kaggle dataset and update MODEL_PATH."
        )

    for i, case in enumerate(TEST_CASES):
        for mod in MODALITY_ORDER:
            p = case["paths"].get(mod)
            if not p or not Path(p).exists():
                print(
                    f"Warning: case[{i}] '{case.get('name')}' missing file for {mod}: {p}"
                )

    model = load_stage2_model(MODEL_PATH)

    print("\n" + "#" * 72)
    print("# CROSS-VALIDATION: hyperparameters per method")
    print("#" * 72)

    best_pci, cv_pci = leave_one_out_cv(model, TEST_CASES, "pci", PCI_PARAM_GRID)
    best_occ, cv_occ = leave_one_out_cv(
        model, TEST_CASES, "occlusion", OCCLUSION_PARAM_GRID
    )
    cv_shap: list[dict[str, Any]] = []
    if ENABLE_SHAP:
        best_shap, cv_shap = leave_one_out_cv(
            model, TEST_CASES, "shap", SHAP_PARAM_GRID
        )
    else:
        best_shap = SHAP_PARAM_GRID[0]
        print("\n[shap] skipped (ENABLE_SHAP=False)")

    best_params: dict[str, dict[str, Any]] = {
        "pci": best_pci,
        "occlusion": best_occ,
    }
    if ENABLE_SHAP:
        best_params["shap"] = best_shap

    cv_report = {
        "best_params": best_params,
        "cv_rows": cv_pci + cv_occ + cv_shap,
    }
    cv_path = OUTPUT_DIR / "cv_results.json"

    def _json_default(obj: Any) -> Any:
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.integer):
            return int(obj)
        raise TypeError(type(obj))

    with cv_path.open("w", encoding="utf-8") as f:
        json.dump(cv_report, f, indent=2, default=_json_default)
    print(f"\nSaved CV details: {cv_path}")

    print("\n" + "#" * 72)
    print("# COMPARISON at best CV params")
    print("#" * 72)

    comparison = compare_methods(model, TEST_CASES, best_params)
    comp_path = OUTPUT_DIR / "method_comparison.json"
    with comp_path.open("w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2, default=_json_default)
    print(f"Saved comparison: {comp_path}")

    print_comparison_table(comparison)

    print("\nDone. Outputs in:", OUTPUT_DIR)
    if SAVE_VISUAL_OUTPUTS:
        print("  PNG heatmaps/overlays:", OUTPUT_DIR / "visuals")
    if SAVE_HEATMAP_PREVIEWS:
        print("  Preview grids:", OUTPUT_DIR / "previews")

    zip_path: Path | None = None
    if EXPORT_ZIP_AT_END:
        zip_path = export_results_zip(OUTPUT_DIR)

    return {
        "comparison": comparison,
        "best_params": best_params,
        "output_dir": str(OUTPUT_DIR),
        "zip_path": str(zip_path) if zip_path else None,
    }


if __name__ == "__main__":
    results = main()
    try:
        display_benchmark_results(comparison=results["comparison"])
    except Exception:
        pass
