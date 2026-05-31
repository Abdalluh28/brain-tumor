from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .config import MODALITY_ORDER, STAGE1_MODALITIES
from .preprocessing import (
    build_multichannel_tensor,
    load_modality_volume,
    map_files_to_modalities,
    select_slices_for_classification,
    validate_2d_mri_brain_size,
    validate_matching_volume_shapes,
)
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
    volume_map: dict[str, np.ndarray]
    stage1_tensor: np.ndarray
    stage4_tensor: np.ndarray
    xai_stage1_tensor: np.ndarray
    xai_stage4_tensor: np.ndarray
    segmentation_tensor: np.ndarray
    t1n_gray: np.ndarray
    slice_filter: dict
    good_slices: list[int]
    reference_depth: int


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


def prepare_mri_scan_inputs(files: list[ScanFileIn]) -> PreparedScanInputs:
    """
  Prepare tensors for a single-slice 2D MRI upload (four PNG/JPEG images).
    """
    modality_map = map_files_to_modalities(files)

    stage1_2d = build_multichannel_tensor(modality_map, list(STAGE1_MODALITIES))
    stage4_2d = build_multichannel_tensor(modality_map, list(MODALITY_ORDER))

    stage1_tensor = np.expand_dims(stage1_2d, axis=0).astype(np.float32)
    stage4_tensor = np.expand_dims(stage4_2d, axis=0).astype(np.float32)

    seg_channels = [
        _normalize_percentile(stage4_2d[:, :, idx])
        for idx in range(len(MODALITY_ORDER))
    ]
    segmentation_tensor = np.stack(seg_channels, axis=-1).astype(np.float32)

    volume_map = {
        modality: channel[:, :, np.newaxis]
        for modality, channel in zip(
            MODALITY_ORDER,
            [stage4_2d[:, :, i] for i in range(len(MODALITY_ORDER))],
            strict=True,
        )
    }

    t1c_index = MODALITY_ORDER.index("t1c")
    slice_filter = validate_2d_mri_brain_size(stage4_2d[:, :, t1c_index])
    slice_filter = {
        **slice_filter,
        "reference_modality": "t1c",
        "reference_depth": 1,
        "representative_slice": 0,
        "scan_mode": "2D",
    }

    return PreparedScanInputs(
        modality_map=modality_map,
        volume_map=volume_map,
        stage1_tensor=stage1_tensor,
        stage4_tensor=stage4_tensor,
        xai_stage1_tensor=stage1_2d.astype(np.float32),
        xai_stage4_tensor=stage4_2d.astype(np.float32),
        segmentation_tensor=segmentation_tensor,
        t1n_gray=seg_channels[0],
        slice_filter=slice_filter,
        good_slices=[0],
        reference_depth=1,
    )


def prepare_scan_inputs(files: list[ScanFileIn]) -> PreparedScanInputs:
    modality_map = map_files_to_modalities(files)
    volume_map = {
        modality: load_modality_volume(scan_file.rawPath, scan_file.format)
        for modality, scan_file in modality_map.items()
    }
    validate_matching_volume_shapes(volume_map, reference_modality="t1c")

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
        "reference_depth": int(reference_depth),
        "representative_slice": int(representative_z),
    }

    return PreparedScanInputs(
        modality_map=modality_map,
        volume_map=volume_map,
        stage1_tensor=stage1_tensor,
        stage4_tensor=stage4_tensor,
        xai_stage1_tensor=xai_stage1_tensor,
        xai_stage4_tensor=xai_stage4_tensor,
        segmentation_tensor=segmentation_tensor,
        t1n_gray=seg_channels[0],
        slice_filter=slice_filter,
        good_slices=good_slices,
        reference_depth=reference_depth,
    )


def build_slice_tensor(
    volume_map: dict[str, np.ndarray],
    modalities: list[str],
    z: int,
    reference_depth: int,
    *,
    normalize_segmentation: bool = False,
) -> np.ndarray:
    channels = []
    for modality in modalities:
        slice_2d = _slice_for_reference_z(
            volume_map[modality], z, reference_depth
        ).astype(np.float32)
        if normalize_segmentation:
            slice_2d = _normalize_percentile(slice_2d)
        channels.append(slice_2d)
    return np.stack(channels, axis=-1).astype(np.float32)
