from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
import tensorflow as tf

from ..config import (
    PERMUTATION_CHANNEL_IMPORTANCE_SAMPLES,
    PERMUTATION_OCCLUSION_PATCH_SIZE,
    PERMUTATION_OCCLUSION_STRIDE,
    PERMUTATION_PCI_GRID_COLS,
    PERMUTATION_PCI_GRID_ROWS,
    PERMUTATION_PCI_PERMUTATIONS_PER_CELL,
    PERMUTATION_SHAP_BACKGROUND_SAMPLES,
)
from .utils import IMG_HEIGHT, IMG_WIDTH, normalize_heatmap

PermutationXaiMethod = Literal["pci", "occlusion", "shap"]


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


def _channel_importance_scores(
    model,
    batch: tf.Tensor,
    class_index: int,
    num_channels: int,
    heatmaps: list[np.ndarray] | None = None,
) -> list[float]:
    """
    Rank modalities by how much the target-class score changes when each
    channel is disrupted (zero-out, mean-fill, and repeated shuffles).

    Uses |baseline - score| so importance is non-negative even when
    permutation increases the target probability.
    """
    baseline = _target_score(model, batch, class_index)
    base_np = batch.numpy().copy()
    rng = np.random.default_rng(class_index * 97 + num_channels * 13)
    importances: list[float] = []

    for channel_index in range(num_channels):
        candidates: list[float] = []

        zeroed = base_np.copy()
        zeroed[0, :, :, channel_index] = 0.0
        candidates.append(
            abs(baseline - _target_score(model, tf.constant(zeroed, dtype=tf.float32), class_index))
        )

        mean_filled = base_np.copy()
        mean_filled[0, :, :, channel_index] = _channel_baseline(base_np, channel_index)
        candidates.append(
            abs(
                baseline
                - _target_score(
                    model, tf.constant(mean_filled, dtype=tf.float32), class_index
                )
            )
        )

        for sample in range(PERMUTATION_CHANNEL_IMPORTANCE_SAMPLES):
            permuted = base_np.copy()
            flat = permuted[0, :, :, channel_index].reshape(-1)
            rng.shuffle(flat)
            permuted[0, :, :, channel_index] = flat.reshape(IMG_HEIGHT, IMG_WIDTH)
            candidates.append(
                abs(
                    baseline
                    - _target_score(
                        model, tf.constant(permuted, dtype=tf.float32), class_index
                    )
                )
            )

        importance = float(max(candidates)) if candidates else 0.0

        if importance <= 1e-9 and heatmaps is not None:
            importance = float(np.mean(heatmaps[channel_index]))

        importances.append(importance)

    return importances


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


def _pci_channel_heatmap(
    model,
    batch: tf.Tensor,
    class_index: int,
    channel_index: int,
) -> np.ndarray:
    """
    Permutation-based map: shuffle pixels inside each grid cell on one channel.
    """
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


def _shap_channel_heatmaps(
    model,
    batch: tf.Tensor,
    class_index: int,
    num_channels: int,
) -> tuple[list[np.ndarray], str]:
    """
    SHAP attributions split per input channel.

    Uses GradientExplainer when available; otherwise falls back to
    occlusion maps weighted by full-channel permutation importance.
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
        importances = _channel_importance_scores(
            model, batch, class_index, num_channels, heatmaps=heatmaps
        )
        max_imp = max(importances) if importances else 1.0
        if max_imp > 0:
            heatmaps = [
                normalize_heatmap(heatmap * (importances[i] / max_imp))
                for i, heatmap in enumerate(heatmaps)
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
            _pci_channel_heatmap(model, batch, class_index, channel_index)
            for channel_index in range(num_channels)
        ]
    elif method == "shap":
        heatmaps, shap_backend = _shap_channel_heatmaps(
            model, batch, class_index, num_channels
        )
        extra_meta["shapBackend"] = shap_backend
    else:
        raise ValueError(f"Unsupported permutation method: {method}")

    importances = _channel_importance_scores(
        model, batch, class_index, num_channels, heatmaps=heatmaps
    )
    extra_meta["permutationImportance"] = {
        mod: round(float(val), 6) for mod, val in zip(modalities, importances, strict=True)
    }

    return ChannelExplanationResult(
        heatmaps=heatmaps,
        channel_importances=importances,
        method=method,
        target_class_index=class_index,
        metadata=extra_meta,
    )
