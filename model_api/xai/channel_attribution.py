from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Literal

import numpy as np
import tensorflow as tf

from ..config import (
    PERMUTATION_FULL_CHANNEL_PCI_SAMPLES,
    PERMUTATION_INFERENCE_BATCH_SIZE,
    PERMUTATION_OCCLUSION_PATCH_SIZE,
    PERMUTATION_OCCLUSION_STRIDE,
    PERMUTATION_PARALLEL_CHANNEL_BUILD,
    PERMUTATION_PCI_GRID_COLS,
    PERMUTATION_PCI_GRID_ROWS,
    PERMUTATION_PCI_PERMUTATIONS_PER_CELL,
    PERMUTATION_SHAP_BACKGROUND_SAMPLES,
)
from ..tf_device import configure_tensorflow
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


def _batched_target_scores(
    model,
    inputs: np.ndarray,
    class_index: int,
    *,
    batch_size: int | None = None,
) -> np.ndarray:
    """Run many forward passes in GPU-friendly batches."""
    configure_tensorflow()

    if inputs.ndim != 4:
        raise ValueError(f"Expected (N,H,W,C) inputs, got {inputs.shape}")

    batch_size = batch_size or PERMUTATION_INFERENCE_BATCH_SIZE
    total = inputs.shape[0]
    scores = np.empty(total, dtype=np.float32)

    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        chunk = tf.constant(inputs[start:end], dtype=tf.float32)
        predictions = model(chunk, training=False)
        if predictions.shape[-1] == 1:
            scores[start:end] = predictions[:, 0].numpy()
        else:
            scores[start:end] = predictions[:, class_index].numpy()

    return scores


def _target_score(model, batch: tf.Tensor, class_index: int) -> float:
    configure_tensorflow()
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


def _grid_cell_bounds(row_idx: int, col_idx: int) -> tuple[int, int, int, int]:
    cell_h = max(1, IMG_HEIGHT // PERMUTATION_PCI_GRID_ROWS)
    cell_w = max(1, IMG_WIDTH // PERMUTATION_PCI_GRID_COLS)
    row_start = row_idx * cell_h
    col_start = col_idx * cell_w
    row_end = min(row_start + cell_h, IMG_HEIGHT)
    col_end = min(col_start + cell_w, IMG_WIDTH)
    return row_start, row_end, col_start, col_end


def _permute_grid_cell(
    base_np: np.ndarray,
    channel_index: int,
    class_index: int,
    row_idx: int,
    col_idx: int,
    perm_idx: int,
) -> np.ndarray:
    row_start, row_end, col_start, col_end = _grid_cell_bounds(row_idx, col_idx)
    permuted = base_np.copy()
    cell = permuted[0, row_start:row_end, col_start:col_end, channel_index].reshape(-1)
    rng = np.random.default_rng(
        class_index * 1000 + channel_index * 100 + row_idx * 10 + col_idx + perm_idx
    )
    rng.shuffle(cell)
    permuted[0, row_start:row_end, col_start:col_end, channel_index] = cell.reshape(
        row_end - row_start, col_end - col_start
    )
    return permuted[0]


def _build_grid_pci_stack(
    base_np: np.ndarray,
    channel_index: int,
    class_index: int,
) -> tuple[np.ndarray, list[tuple[int, int, int, int, int, int]]]:
    """Stack all grid PCI perturbations for one channel (CPU)."""
    stacks: list[np.ndarray] = []
    meta: list[tuple[int, int, int, int, int, int]] = []

    for row_idx in range(PERMUTATION_PCI_GRID_ROWS):
        for col_idx in range(PERMUTATION_PCI_GRID_COLS):
            row_start, row_end, col_start, col_end = _grid_cell_bounds(row_idx, col_idx)
            for perm_idx in range(PERMUTATION_PCI_PERMUTATIONS_PER_CELL):
                stacks.append(
                    _permute_grid_cell(
                        base_np,
                        channel_index,
                        class_index,
                        row_idx,
                        col_idx,
                        perm_idx,
                    )
                )
                meta.append(
                    (row_idx, col_idx, row_start, row_end, col_start, col_end),
                )

    return np.stack(stacks, axis=0).astype(np.float32), meta


def _heatmap_from_grid_pci_scores(
    scores: np.ndarray,
    baseline: float,
    meta: list[tuple[int, int, int, int, int, int]],
) -> tuple[np.ndarray, float]:
    heatmap = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)
    drops = np.abs(baseline - scores)
    per_cell = PERMUTATION_PCI_PERMUTATIONS_PER_CELL
    num_cells = len(meta) // per_cell

    for cell_index in range(num_cells):
        _row_idx, _col_idx, row_start, row_end, col_start, col_end = meta[
            cell_index * per_cell
        ]
        cell_drops = drops[cell_index * per_cell : (cell_index + 1) * per_cell]
        cell_value = float(np.mean(cell_drops)) if len(cell_drops) else 0.0
        heatmap[row_start:row_end, col_start:col_end] = cell_value

    importance = float(np.mean(drops)) if len(drops) else 0.0
    return normalize_heatmap(heatmap), importance


def _parallel_build_channel_stacks(
    builder,
    num_channels: int,
) -> list:
    if not PERMUTATION_PARALLEL_CHANNEL_BUILD or num_channels <= 1:
        return [builder(channel_index) for channel_index in range(num_channels)]

    results: list = [None] * num_channels
    with ThreadPoolExecutor(max_workers=num_channels) as executor:
        futures = {
            executor.submit(builder, channel_index): channel_index
            for channel_index in range(num_channels)
        }
        for future in futures:
            channel_index = futures[future]
            results[channel_index] = future.result()
    return results


def _grid_pci_all_channels(
    model,
    batch: tf.Tensor,
    class_index: int,
    num_channels: int,
) -> tuple[list[np.ndarray], list[float]]:
    """Batched grid PCI: stack perturbations on CPU, infer on GPU in batches."""
    base_np = batch.numpy().copy()
    baseline = _target_score(model, batch, class_index)

    channel_stacks = _parallel_build_channel_stacks(
        lambda channel_index: _build_grid_pci_stack(
            base_np, channel_index, class_index
        ),
        num_channels,
    )

    heatmaps: list[np.ndarray] = []
    importances: list[float] = []
    for stack, meta in channel_stacks:
        scores = _batched_target_scores(model, stack, class_index)
        heatmap, importance = _heatmap_from_grid_pci_scores(scores, baseline, meta)
        heatmaps.append(heatmap)
        importances.append(importance)

    return heatmaps, importances


def _build_full_channel_pci_stack(
    base_np: np.ndarray,
    channel_index: int,
    class_index: int,
) -> np.ndarray:
    stacks: list[np.ndarray] = []
    for perm_idx in range(PERMUTATION_FULL_CHANNEL_PCI_SAMPLES):
        permuted = base_np.copy()
        flat = permuted[0, :, :, channel_index].reshape(-1).copy()
        rng = np.random.default_rng(class_index * 5000 + channel_index * 100 + perm_idx)
        rng.shuffle(flat)
        permuted[0, :, :, channel_index] = flat.reshape(IMG_HEIGHT, IMG_WIDTH)
        stacks.append(permuted[0])
    return np.stack(stacks, axis=0).astype(np.float32)


def _full_channel_pci_all_channels(
    model,
    batch: tf.Tensor,
    class_index: int,
    num_channels: int,
) -> tuple[list[np.ndarray], list[float]]:
    base_np = batch.numpy().copy()
    baseline = _target_score(model, batch, class_index)
    heatmaps: list[np.ndarray] = []
    importances: list[float] = []

    for channel_index in range(num_channels):
        stack = _build_full_channel_pci_stack(base_np, channel_index, class_index)
        scores = _batched_target_scores(model, stack, class_index)
        drops = np.abs(baseline - scores)
        importances.append(float(np.mean(drops)) if len(drops) else 0.0)

        orig = base_np[0, :, :, channel_index].astype(np.float32)
        heatmap = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)
        for perm_idx, drop in enumerate(drops):
            shuffled = stack[perm_idx, :, :, channel_index]
            heatmap += np.abs(orig - shuffled) * float(drop)
        heatmap /= max(PERMUTATION_FULL_CHANNEL_PCI_SAMPLES, 1)
        heatmaps.append(normalize_heatmap(heatmap))

    return heatmaps, importances


def _build_occlusion_stack(
    base_np: np.ndarray,
    channel_index: int,
) -> tuple[np.ndarray, list[tuple[int, int]]]:
    fill_value = _channel_baseline(base_np, channel_index)
    patch = PERMUTATION_OCCLUSION_PATCH_SIZE
    stride = PERMUTATION_OCCLUSION_STRIDE
    stacks: list[np.ndarray] = []
    positions: list[tuple[int, int]] = []

    for row in range(0, IMG_HEIGHT - patch + 1, stride):
        for col in range(0, IMG_WIDTH - patch + 1, stride):
            occluded = base_np.copy()
            occluded[0, row : row + patch, col : col + patch, channel_index] = fill_value
            stacks.append(occluded[0])
            positions.append((row, col))

    if not stacks:
        return np.empty((0, IMG_HEIGHT, IMG_WIDTH, base_np.shape[-1]), dtype=np.float32), []

    return np.stack(stacks, axis=0).astype(np.float32), positions


def _occlusion_heatmap_from_scores(
    scores: np.ndarray,
    baseline: float,
    positions: list[tuple[int, int]],
) -> np.ndarray:
    patch = PERMUTATION_OCCLUSION_PATCH_SIZE
    heatmap = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)
    counts = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)
    drops = np.abs(baseline - scores)

    for (row, col), drop in zip(positions, drops, strict=True):
        heatmap[row : row + patch, col : col + patch] += drop
        counts[row : row + patch, col : col + patch] += 1.0

    heatmap /= np.maximum(counts, 1.0)
    return normalize_heatmap(heatmap)


def _occlusion_all_channels(
    model,
    batch: tf.Tensor,
    class_index: int,
    num_channels: int,
) -> tuple[list[np.ndarray], list[float]]:
    base_np = batch.numpy().copy()
    baseline = _target_score(model, batch, class_index)

    channel_stacks = _parallel_build_channel_stacks(
        lambda channel_index: _build_occlusion_stack(base_np, channel_index),
        num_channels,
    )

    heatmaps: list[np.ndarray] = []
    importances: list[float] = []
    for stack, positions in channel_stacks:
        if stack.shape[0] == 0:
            heatmaps.append(np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32))
            importances.append(0.0)
            continue
        scores = _batched_target_scores(model, stack, class_index)
        heatmaps.append(_occlusion_heatmap_from_scores(scores, baseline, positions))
        importances.append(float(np.mean(np.abs(baseline - scores))))

    return heatmaps, importances


def _importance_tinted_heatmap(normalized_importance: float) -> np.ndarray:
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
    try:
        import shap
    except ImportError as exc:
        raise RuntimeError(
            "SHAP is not installed. Add 'shap' to model_api requirements."
        ) from exc

    configure_tensorflow()
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
        heatmaps, importances = _occlusion_all_channels(
            model, batch, class_index, num_channels
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
    configure_tensorflow()

    num_channels = len(modalities)
    if batch.shape[-1] != num_channels:
        raise ValueError(
            f"Expected {num_channels} channels for modalities {modalities}, "
            f"got tensor shape {batch.shape}"
        )

    extra_meta: dict = {
        "inferenceBatchSize": PERMUTATION_INFERENCE_BATCH_SIZE,
        "parallelChannelBuild": PERMUTATION_PARALLEL_CHANNEL_BUILD,
    }

    if method == "occlusion":
        extra_meta["occlusionPatchSize"] = PERMUTATION_OCCLUSION_PATCH_SIZE
        extra_meta["occlusionStride"] = PERMUTATION_OCCLUSION_STRIDE
        heatmaps, raw_importances = _occlusion_all_channels(
            model, batch, class_index, num_channels
        )
    elif method == "pci":
        heatmaps, raw_importances = _grid_pci_all_channels(
            model, batch, class_index, num_channels
        )
    elif method == "pci_full_channel":
        heatmaps, raw_importances = _full_channel_pci_all_channels(
            model, batch, class_index, num_channels
        )
        extra_meta["fullChannelPciHeatmap"] = "spatial_shuffle_diff_batched"
    elif method == "shap":
        heatmaps, shap_backend = _shap_channel_heatmaps(
            model, batch, class_index, num_channels
        )
        extra_meta["shapBackend"] = shap_backend
        raw_importances = [float(np.mean(heatmap)) for heatmap in heatmaps]
    else:
        raise ValueError(f"Unsupported permutation method: {method}")

    raw, normalized = _normalize_channel_importances(raw_importances, num_channels)

    if method == "pci_full_channel":
        for channel_index, heatmap in enumerate(heatmaps):
            if float(heatmap.max()) <= 1e-6:
                heatmaps[channel_index] = _importance_tinted_heatmap(
                    normalized[channel_index]
                )

    extra_meta.update(_build_permutation_importance_metadata(modalities, raw, normalized))

    return ChannelExplanationResult(
        heatmaps=heatmaps,
        channel_importances=normalized,
        method=method,
        target_class_index=class_index,
        metadata=extra_meta,
    )
