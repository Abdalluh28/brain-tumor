from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from .config import MODALITY_ORDER, SLOT_TO_MODALITY
from .preprocessing import (
    load_modality_volume,
    map_files_to_modalities,
    select_slices_for_classification,
    validate_matching_volume_shapes,
)
from .scan_inputs import _slice_for_reference_z
from .schemas import ScanFileIn


def resolve_volume_cache_dir(files: list[ScanFileIn], job_id: str) -> Path:
    first_path = Path(files[0].rawPath)
    uploads_root = first_path.parent.parent
    cache_dir = uploads_root / "cache" / "volumes" / job_id
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def cache_nifti_volumes(
    files: list[ScanFileIn],
    job_id: str,
) -> tuple[Path, dict[str, np.ndarray], dict[str, ScanFileIn], dict]:
    """
    Copy raw volume files into cache and load aligned modality volumes.
    """
    modality_map = map_files_to_modalities(files)
    cache_dir = resolve_volume_cache_dir(files, job_id)

    for modality, scan_file in modality_map.items():
        source = Path(scan_file.rawPath)
        dest = cache_dir / f"{modality}_{source.name}"
        if source.resolve() != dest.resolve():
            shutil.copy2(source, dest)

    volume_map = {
        modality: load_modality_volume(scan_file.rawPath, scan_file.format)
        for modality, scan_file in modality_map.items()
    }
    validate_matching_volume_shapes(volume_map, reference_modality="t1c")

    t1c_volume = volume_map["t1c"]
    slice_filter = select_slices_for_classification(t1c_volume)
    good_slices = list(slice_filter["good_slices"])
    reference_depth = t1c_volume.shape[-1]

    slice_filter = {
        **slice_filter,
        "reference_modality": "t1c",
        "reference_depth": int(reference_depth),
        "representative_slice": int(good_slices[len(good_slices) // 2]),
        "cacheDir": str(cache_dir),
    }

    return cache_dir, volume_map, modality_map, slice_filter


def export_valid_slices_to_png(
    volume_map: dict[str, np.ndarray],
    good_slices: list[int],
    reference_depth: int,
    cache_dir: Path,
) -> dict[int, dict[str, Path]]:
    """Export one PNG per modality per valid z index."""
    slices_dir = cache_dir / "slices"
    slices_dir.mkdir(parents=True, exist_ok=True)
    png_paths: dict[int, dict[str, Path]] = {}

    for z in good_slices:
        png_paths[z] = {}
        for modality in MODALITY_ORDER:
            slice_2d = _slice_for_reference_z(
                volume_map[modality], z, reference_depth
            )
            gray = (np.clip(slice_2d, 0.0, 1.0) * 255.0).astype(np.uint8)
            out_path = slices_dir / f"z{z:04d}_{modality}.png"
            Image.fromarray(gray, mode="L").save(out_path, format="PNG", optimize=True)
            png_paths[z][modality] = out_path

    return png_paths


def build_slice_scan_files(
    z: int,
    png_paths: dict[str, Path],
) -> list[ScanFileIn]:
    """Build four PNG ScanFileIn entries for one slice (2D pipeline input)."""
    files: list[ScanFileIn] = []
    for slot, modality in SLOT_TO_MODALITY.items():
        path = png_paths[modality]
        files.append(
            ScanFileIn(
                rawPath=str(path.resolve()),
                format="png",
                originalName=path.name,
                slot=slot,
                storagePath=str(path.resolve()),
            )
        )
    return files
