from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .config import MODALITY_ORDER, STAGE1_MODALITIES
from .preprocessing import load_modality_volume, map_files_to_modalities, select_slices_for_classification
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
    xai_stage1_tensor: np.ndarray
    xai_stage4_tensor: np.ndarray
    segmentation_tensor: np.ndarray
    t1n_gray: np.ndarray
    slice_filter: dict


def _slice_for_reference_z(
    volume: np.ndarray,
    reference_z: int,
    reference_depth: int,
) -> np.ndarray:
    depth = volume.shape[-1]
    if depth == reference_depth:
        return volume[:, :, reference_z]
    if depth == 1 or reference_depth <= 1:
        return volume[:, :, 0]

    z_rel = reference_z / (reference_depth - 1)
    mapped_z = int(round(z_rel * (depth - 1)))
    return volume[:, :, np.clip(mapped_z, 0, depth - 1)]


def _build_tensor_from_volumes(
    volume_map: dict[str, np.ndarray],
    modalities: list[str],
    z_indices: list[int],
    reference_depth: int,
) -> np.ndarray:
    tensors = []

    for z in z_indices:
        channels = [
            _slice_for_reference_z(volume_map[modality], z, reference_depth).astype(
                np.float32
            )
            for modality in modalities
        ]
        tensors.append(np.stack(channels, axis=-1).astype(np.float32))

    return np.stack(tensors, axis=0)


def prepare_scan_inputs(files: list[ScanFileIn]) -> PreparedScanInputs:
    modality_map = map_files_to_modalities(files)
    volume_map = {
        modality: load_modality_volume(scan_file.rawPath, scan_file.format)
        for modality, scan_file in modality_map.items()
    }

    t1c_volume = volume_map["t1c"]
    reference_depth = t1c_volume.shape[-1]
    slice_filter = select_slices_for_classification(t1c_volume)
    good_slices = list(slice_filter["good_slices"])
    representative_z = good_slices[len(good_slices) // 2]

    stage1_tensor = _build_tensor_from_volumes(
        volume_map,
        list(STAGE1_MODALITIES),
        good_slices,
        reference_depth,
    )
    stage4_tensor = _build_tensor_from_volumes(
        volume_map,
        list(MODALITY_ORDER),
        good_slices,
        reference_depth,
    )

    xai_stage1_tensor = _build_tensor_from_volumes(
        volume_map,
        list(STAGE1_MODALITIES),
        [representative_z],
        reference_depth,
    )[0]
    xai_stage4_tensor = _build_tensor_from_volumes(
        volume_map,
        list(MODALITY_ORDER),
        [representative_z],
        reference_depth,
    )[0]
    seg_channels = [
        _normalize_percentile(xai_stage4_tensor[:, :, idx])
        for idx in range(len(MODALITY_ORDER))
    ]
    segmentation_tensor = np.stack(seg_channels, axis=-1).astype(np.float32)

    slice_filter = {
        **slice_filter,
        "reference_modality": "t1c",
        "representative_slice": int(representative_z),
    }

    return PreparedScanInputs(
        modality_map=modality_map,
        stage1_tensor=stage1_tensor,
        stage4_tensor=stage4_tensor,
        xai_stage1_tensor=xai_stage1_tensor,
        xai_stage4_tensor=xai_stage4_tensor,
        segmentation_tensor=segmentation_tensor,
        t1n_gray=seg_channels[0],
        slice_filter=slice_filter,
    )
