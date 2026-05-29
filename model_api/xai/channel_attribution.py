from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
import tensorflow as tf

from ..config import (
    PERMUTATION_FULL_CHANNEL_PCI_SAMPLES,
    PERMUTATION_OCCLUSION_PATCH_SIZE,
    PERMUTATION_OCCLUSION_STRIDE,
    PERMUTATION_PCI_GRID_COLS,
    PERMUTATION_PCI_GRID_ROWS,
    PERMUTATION_PCI_PERMUTATIONS_PER_CELL,
    PERMUTATION_SHAP_BACKGROUND_SAMPLES,
)
from .utils import IMG_HEIGHT, IMG_WIDTH, normalize_heatmap

PermutationXaiMethod = Literal["pci", "pci_full_channel", "occlusion", "shap"]


@dataclass(frozen=True)
class ChannelExplanationResult:
    """Per-modality spatial maps in [0, 1] with shape (H, W)."""

    heatmaps: list[np.ndarray]
    channel_importances: list[float]
    method: PermutationXaiMethod
    target_class_index: int
    metadata: dict


def _target_score(model, batch: tf.Tensor, class_index: int) -> float:
    predictions = model(batch, training=False)
    if predictions.shape[-1] == 1:
        return float(predictions[0, 0].numpy())
    return float(predictions[0, class_index].numpy())


def _channel_baseline(batch: np.ndarray, channel_index: int) -> float:
    return float(np.mean(batch[0, :, :, channel_index]))


def _normalize_channel_importances(
    raw: list[float],
    num_channels: int,
) -> tuple[list[float], list[float]]:
    total = float(sum(raw))
    if total > 1e-12:
        normalized = [value / total for value in raw]
    else:
        normalized = [1.0 / num_channels] * num_channels
    return raw, normalized


def _build_permutation_importance_metadata(
    modalities: list[str],
    raw: list[float],
    normalized: list[float],
) -> dict:
    return {
        "permutationImportanceRaw": {
            mod: round(float(val), 6) for mod, val in zip(modalities, raw, strict=True)
        },
        "permutationImportance": {
            mod: round(float(val), 6)
            for mod, val in zip(modalities, normalized, strict=True)
        },
        "permutationImportancePercent": {
            mod: round(float(val) * 100.0, 2)
            for mod, val in zip(modalities, normalized, strict=True)
        },
    }


def _grid_pci_channel_importance(
    model,
    batch: tf.Tensor,
    class_index: int,
    channel_index: int,
) -> float:
    """Mean |Δp| when permuting each grid cell on this channel (grid PCI)."""
    baseline = _target_score(model, batch, class_index)
    base_np = batch.numpy().copy()
    cell_h = max(1, IMG_HEIGHT // PERMUTATION_PCI_GRID_ROWS)
    cell_w = max(1, IMG_WIDTH // PERMUTATION_PCI_GRID_COLS)
    deltas: list[float] = []

    for row_idx in range(PERMUTATION_PCI_GRID_ROWS):
        for col_idx in range(PERMUTATION_PCI_GRID_COLS):
            row_start = row_idx * cell_h
            col_start = col_idx * cell_w
            row_end = min(row_start + cell_h, IMG_HEIGHT)
            col_end = min(col_start + cell_w, IMG_WIDTH)

            for perm_idx in range(PERMUTATION_PCI_PERMUTATIONS_PER_CELL):
                permuted = base_np.copy()
                cell = permuted[
                    0, row_start:row_end, col_start:col_end, channel_index
                ].reshape(-1)
                rng = np.random.default_rng(
                    class_index * 1000 + channel_index * 100 + row_idx * 10 + col_idx + perm_idx
                )
                rng.shuffle(cell)
                permuted[0, row_start:row_end, col_start:col_end, channel_index] = (
                    cell.reshape(row_end - row_start, col_end - col_start)
                )
                score = _target_score(
                    model, tf.constant(permuted, dtype=tf.float32), class_index
                )
                deltas.append(abs(baseline - score))

    return float(np.mean(deltas)) if deltas else 0.0


def _full_channel_pci_channel_importance(
    model,
    batch: tf.Tensor,
    class_index: int,
    channel_index: int,
) -> float:
    """Mean |Δp| when shuffling the entire channel (full-channel PCI)."""
    baseline = _target_score(model, batch, class_index)
    base_np = batch.numpy().copy()
    deltas: list[float] = []

    for perm_idx in range(PERMUTATION_FULL_CHANNEL_PCI_SAMPLES):
        permuted = base_np.copy()
        flat = permuted[0, :, :, channel_index].reshape(-1).copy()
        rng = np.random.default_rng(
            class_index * 5000 + channel_index * 100 + perm_idx
        )
        rng.shuffle(flat)
        permuted[0, :, :, channel_index] = flat.reshape(IMG_HEIGHT, IMG_WIDTH)
        score = _target_score(
            model, tf.constant(permuted, dtype=tf.float32), class_index
        )
        deltas.append(abs(baseline - score))

    return float(np.mean(deltas)) if deltas else 0.0


def _occlusion_channel_importance(
    model,
    batch: tf.Tensor,
    class_index: int,
    channel_index: int,
) -> float:
    """Mean |Δp| from sliding occlusion on this channel only."""
    baseline = _target_score(model, batch, class_index)
    base_np = batch.numpy().copy()
    fill_value = _channel_baseline(base_np, channel_index)
    patch = PERMUTATION_OCCLUSION_PATCH_SIZE
    stride = PERMUTATION_OCCLUSION_STRIDE
    deltas: list[float] = []

    for row in range(0, IMG_HEIGHT - patch + 1, stride):
        for col in range(0, IMG_WIDTH - patch + 1, stride):
            occluded = base_np.copy()
            occluded[
                0,
                row : row + patch,
                col : col + patch,
                channel_index,
            ] = fill_value
            score = _target_score(
                model, tf.constant(occluded, dtype=tf.float32), class_index
            )
            deltas.append(abs(baseline - score))

    return float(np.mean(deltas)) if deltas else 0.0


def _importances_for_method(
    model,
    batch: tf.Tensor,
    class_index: int,
    num_channels: int,
    method: PermutationXaiMethod,
    heatmaps: list[np.ndarray] | None = None,
) -> tuple[list[float], list[float]]:
    if method == "pci":
        raw = [
            _grid_pci_channel_importance(model, batch, class_index, channel_index)
            for channel_index in range(num_channels)
        ]
    elif method == "pci_full_channel":
        raw = [
            _full_channel_pci_channel_importance(
                model, batch, class_index, channel_index
            )
            for channel_index in range(num_channels)
        ]
    elif method == "occlusion":
        raw = [
            _occlusion_channel_importance(model, batch, class_index, channel_index)
            for channel_index in range(num_channels)
        ]
    elif method == "shap":
        if heatmaps is None:
            raise ValueError("SHAP importances require heatmaps")
        raw = [float(np.mean(heatmap)) for heatmap in heatmaps]
    else:
        raise ValueError(f"Unsupported method: {method}")

    if heatmaps is not None and max(raw) <= 1e-12:
        raw = [float(np.mean(heatmap)) for heatmap in heatmaps]

    return _normalize_channel_importances(raw, num_channels)


def _occlusion_channel_heatmap(
    model,
    batch: tf.Tensor,
    class_index: int,
    channel_index: int,
) -> np.ndarray:
    """Occlusion sensitivity map on a single input channel."""
    baseline = _target_score(model, batch, class_index)
    base_np = batch.numpy().copy()
    fill_value = _channel_baseline(base_np, channel_index)
    heatmap = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)
    counts = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)

    patch = PERMUTATION_OCCLUSION_PATCH_SIZE
    stride = PERMUTATION_OCCLUSION_STRIDE

    for row in range(0, IMG_HEIGHT - patch + 1, stride):
        for col in range(0, IMG_WIDTH - patch + 1, stride):
            occluded = base_np.copy()
            occluded[
                0,
                row : row + patch,
                col : col + patch,
                channel_index,
            ] = fill_value
            score = _target_score(
                model, tf.constant(occluded, dtype=tf.float32), class_index
            )
            drop = abs(baseline - score)
            heatmap[row : row + patch, col : col + patch] += drop
            counts[row : row + patch, col : col + patch] += 1.0

    heatmap /= np.maximum(counts, 1.0)
    return normalize_heatmap(heatmap)


def _pci_grid_channel_heatmap(
    model,
    batch: tf.Tensor,
    class_index: int,
    channel_index: int,
) -> np.ndarray:
    """Grid PCI: shuffle pixels inside each grid cell on one channel."""
    baseline = _target_score(model, batch, class_index)
    base_np = batch.numpy().copy()
    cell_h = max(1, IMG_HEIGHT // PERMUTATION_PCI_GRID_ROWS)
    cell_w = max(1, IMG_WIDTH // PERMUTATION_PCI_GRID_COLS)
    heatmap = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)

    for row_idx in range(PERMUTATION_PCI_GRID_ROWS):
        for col_idx in range(PERMUTATION_PCI_GRID_COLS):
            row_start = row_idx * cell_h
            col_start = col_idx * cell_w
            row_end = min(row_start + cell_h, IMG_HEIGHT)
            col_end = min(col_start + cell_w, IMG_WIDTH)

            drops: list[float] = []
            for perm_idx in range(PERMUTATION_PCI_PERMUTATIONS_PER_CELL):
                permuted = base_np.copy()
                cell = permuted[
                    0, row_start:row_end, col_start:col_end, channel_index
                ].reshape(-1)
                rng = np.random.default_rng(
                    class_index * 1000 + channel_index * 100 + row_idx * 10 + col_idx + perm_idx
                )
                rng.shuffle(cell)
                permuted[0, row_start:row_end, col_start:col_end, channel_index] = (
                    cell.reshape(row_end - row_start, col_end - col_start)
                )
                score = _target_score(
                    model, tf.constant(permuted, dtype=tf.float32), class_index
                )
                drops.append(abs(baseline - score))

            cell_value = float(np.mean(drops)) if drops else 0.0
            heatmap[row_start:row_end, col_start:col_end] = cell_value

    return normalize_heatmap(heatmap)


def _pci_full_channel_spatial_heatmap(
    model,
    batch: tf.Tensor,
    class_index: int,
    channel_index: int,
) -> np.ndarray:
    """
    Spatial full-channel PCI: where shuffling this channel changes pixels,
    weighted by |Δp| for that shuffle (same perturbations as importance).
    """
    baseline = _target_score(model, batch, class_index)
    base_np = batch.numpy().copy()
    orig = base_np[0, :, :, channel_index].astype(np.float32)
    heatmap = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)

    for perm_idx in range(PERMUTATION_FULL_CHANNEL_PCI_SAMPLES):
        permuted = base_np.copy()
        flat = permuted[0, :, :, channel_index].reshape(-1).copy()
        rng = np.random.default_rng(
            class_index * 5000 + channel_index * 100 + perm_idx
        )
        rng.shuffle(flat)
        shuffled = flat.reshape(IMG_HEIGHT, IMG_WIDTH)
        permuted[0, :, :, channel_index] = shuffled
        score = _target_score(
            model, tf.constant(permuted, dtype=tf.float32), class_index
        )
        drop = abs(baseline - score)
        heatmap += np.abs(orig - shuffled) * drop

    heatmap /= max(PERMUTATION_FULL_CHANNEL_PCI_SAMPLES, 1)
    return normalize_heatmap(heatmap)


def _importance_tinted_heatmap(normalized_importance: float) -> np.ndarray:
    """Fallback when spatial PCI is flat; do not min-max a constant field."""
    return np.full(
        (IMG_HEIGHT, IMG_WIDTH),
        np.clip(float(normalized_importance), 0.0, 1.0),
        dtype=np.float32,
    )


def _shap_channel_heatmaps(
    model,
    batch: tf.Tensor,
    class_index: int,
    num_channels: int,
) -> tuple[list[np.ndarray], str]:
    """
    SHAP attributions split per input channel.

    Uses GradientExplainer when available; otherwise falls back to
    occlusion heatmaps.
    """
    try:
        import shap
    except ImportError as exc:
        raise RuntimeError(
            "SHAP is not installed. Add 'shap' to model_api requirements."
        ) from exc

    input_np = batch.numpy()
    background = np.repeat(input_np, PERMUTATION_SHAP_BACKGROUND_SAMPLES, axis=0).astype(
        np.float32
    )
    rng = np.random.default_rng(42)
    background += rng.normal(0, 0.02, background.shape).astype(np.float32)
    background = np.clip(background, 0.0, 1.0)

    def target_output(x):
        preds = model(tf.constant(x, dtype=tf.float32), training=False)
        if preds.shape[-1] == 1:
            return preds[:, 0]
        return preds[:, class_index]

    try:
        explainer = shap.GradientExplainer(target_output, background)
        shap_values = explainer.shap_values(input_np)
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
        shap_values = np.asarray(shap_values, dtype=np.float32)
        if shap_values.ndim == 4 and shap_values.shape[0] == 1:
            shap_values = shap_values[0]
        if shap_values.ndim != 3:
            raise ValueError(f"Unexpected SHAP shape: {shap_values.shape}")

        heatmaps = []
        for channel_index in range(num_channels):
            channel_attr = np.abs(shap_values[:, :, channel_index])
            heatmaps.append(normalize_heatmap(channel_attr))
        return heatmaps, "shap_gradient"
    except Exception:
        heatmaps = [
            _occlusion_channel_heatmap(model, batch, class_index, channel_index)
            for channel_index in range(num_channels)
        ]
        return heatmaps, "shap_occlusion_fallback"


def generate_channel_explanations(
    model,
    batch: tf.Tensor,
    method: PermutationXaiMethod,
    class_index: int,
    modalities: list[str],
) -> ChannelExplanationResult:
    """Build one spatial attribution map per model input channel."""
    num_channels = len(modalities)
    if batch.shape[-1] != num_channels:
        raise ValueError(
            f"Expected {num_channels} channels for modalities {modalities}, "
            f"got tensor shape {batch.shape}"
        )

    extra_meta: dict = {}

    if method == "occlusion":
        extra_meta["occlusionPatchSize"] = PERMUTATION_OCCLUSION_PATCH_SIZE
        extra_meta["occlusionStride"] = PERMUTATION_OCCLUSION_STRIDE
        heatmaps = [
            _occlusion_channel_heatmap(model, batch, class_index, channel_index)
            for channel_index in range(num_channels)
        ]
    elif method == "pci":
        heatmaps = [
            _pci_grid_channel_heatmap(model, batch, class_index, channel_index)
            for channel_index in range(num_channels)
        ]
    elif method == "pci_full_channel":
        raw_probe, normalized_probe = _importances_for_method(
            model, batch, class_index, num_channels, method
        )
        heatmaps = []
        for channel_index in range(num_channels):
            spatial = _pci_full_channel_spatial_heatmap(
                model, batch, class_index, channel_index
            )
            if float(spatial.max()) > 1e-6:
                heatmaps.append(spatial)
            else:
                heatmaps.append(
                    _importance_tinted_heatmap(normalized_probe[channel_index])
                )
        raw, normalized = raw_probe, normalized_probe
        extra_meta.update(_build_permutation_importance_metadata(modalities, raw, normalized))
        extra_meta["fullChannelPciHeatmap"] = "spatial_shuffle_diff"
    elif method == "shap":
        heatmaps, shap_backend = _shap_channel_heatmaps(
            model, batch, class_index, num_channels
        )
        extra_meta["shapBackend"] = shap_backend
        raw, normalized = _importances_for_method(
            model, batch, class_index, num_channels, method, heatmaps=heatmaps
        )
        extra_meta.update(_build_permutation_importance_metadata(modalities, raw, normalized))
    else:
        raise ValueError(f"Unsupported permutation method: {method}")

    if method not in ("pci_full_channel", "shap"):
        raw, normalized = _importances_for_method(
            model, batch, class_index, num_channels, method, heatmaps=heatmaps
        )
        extra_meta.update(_build_permutation_importance_metadata(modalities, raw, normalized))

    importances = normalized

    return ChannelExplanationResult(
        heatmaps=heatmaps,
        channel_importances=importances,
        method=method,
        target_class_index=class_index,
        metadata=extra_meta,
    )
