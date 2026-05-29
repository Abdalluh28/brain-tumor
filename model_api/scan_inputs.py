from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .config import MODALITY_ORDER, STAGE1_MODALITIES
from .preprocessing import build_multichannel_tensor, load_modality_slice, map_files_to_modalities
from .schemas import ScanFileIn


def _normalize_percentile(image: np.ndarray) -> np.ndarray:
    array = image.astype(np.float32)
    non_zero = array[array > 0]
    if non_zero.size == 0:
        return np.zeros_like(array, dtype=np.float32)

    vmin, vmax = np.percentile(non_zero, (1, 99))
    array = np.clip(array, vmin, vmax)
    return ((array - vmin) / (vmax - vmin + 1e-8)).astype(np.float32)


@dataclass(frozen=True)
class PreparedScanInputs:
    """MRI tensors loaded once per analyze / XAI / segmentation run."""

    modality_map: dict[str, ScanFileIn]
    stage1_tensor: np.ndarray
    stage4_tensor: np.ndarray
    segmentation_tensor: np.ndarray
    t1n_gray: np.ndarray


def prepare_scan_inputs(files: list[ScanFileIn]) -> PreparedScanInputs:
    modality_map = map_files_to_modalities(files)
    stage1_tensor = build_multichannel_tensor(modality_map, list(STAGE1_MODALITIES))

    channels = []
    for modality in MODALITY_ORDER:
        scan_file = modality_map[modality]
        channel = load_modality_slice(scan_file.rawPath, scan_file.format)
        channels.append(channel.astype(np.float32))

    stage4_tensor = np.stack(channels, axis=-1)
    seg_channels = [_normalize_percentile(channel) for channel in channels]
    segmentation_tensor = np.stack(seg_channels, axis=-1).astype(np.float32)

    return PreparedScanInputs(
        modality_map=modality_map,
        stage1_tensor=stage1_tensor,
        stage4_tensor=stage4_tensor,
        segmentation_tensor=segmentation_tensor,
        t1n_gray=seg_channels[0],
    )
