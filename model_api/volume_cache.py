from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from .config import MODALITY_ORDER, SLOT_TO_MODALITY
from .nifti_volume import load_nifti_volume_viewer_aligned, save_mask_volume_nifti
from .preprocessing import (
    map_files_to_modalities,
    select_slices_for_classification,
    validate_matching_volume_shapes,
)
from .schemas import ScanFileIn
from .segmentation import build_public_upload_url


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
    Copy raw NIfTI files into cache and load volumes aligned with the MRI viewer.
    """
    modality_map = map_files_to_modalities(files)
    cache_dir = resolve_volume_cache_dir(files, job_id)

    for modality, scan_file in modality_map.items():
        source = Path(scan_file.rawPath)
        dest = cache_dir / f"{modality}_{source.name}"
        if source.resolve() != dest.resolve():
            shutil.copy2(source, dest)

    volume_map: dict[str, np.ndarray] = {}
    affines: dict[str, np.ndarray] = {}
    native_shapes: dict[str, tuple[int, int, int]] = {}

    for modality, scan_file in modality_map.items():
        volume, affine, native_shape = load_nifti_volume_viewer_aligned(
            scan_file.rawPath
        )
        volume_map[modality] = volume
        affines[modality] = affine
        native_shapes[modality] = native_shape

    validate_matching_volume_shapes(volume_map, reference_modality="t1c")

    t1c_volume = volume_map["t1c"]
    slice_filter = select_slices_for_classification(t1c_volume)
    good_slices = list(slice_filter["good_slices"])
    reference_depth = t1c_volume.shape[-1]

    slice_filter = {
        **slice_filter,
        "reference_modality": "t1c",
        "reference_depth": int(reference_depth),
        "native_shape": native_shapes["t1c"],
        "representative_slice": int(good_slices[len(good_slices) // 2]),
        "cacheDir": str(cache_dir),
        "referenceNiftiPath": str(
            Path(modality_map["t1c"].rawPath).resolve()
        ),
    }

    return cache_dir, volume_map, modality_map, slice_filter


def export_valid_slices_to_png(
    volume_map: dict[str, np.ndarray],
    good_slices: list[int],
    cache_dir: Path,
    backend_public_url: str | None = None,
) -> tuple[dict[int, dict[str, Path]], list[dict]]:
    """
    Export one PNG per modality per valid slice (viewer-aligned indices).

    Returns png paths and a preview manifest for the API / frontend.
    """
    slices_dir = cache_dir / "slices"
    slices_dir.mkdir(parents=True, exist_ok=True)
    png_paths: dict[int, dict[str, Path]] = {}
    valid_slice_previews: list[dict] = []

    for z in good_slices:
        png_paths[z] = {}
        modalities_urls: dict[str, str] = {}

        for modality in MODALITY_ORDER:
            slice_2d = volume_map[modality][:, :, z]
            gray = (np.clip(slice_2d, 0.0, 1.0) * 255.0).astype(np.uint8)
            out_path = slices_dir / f"z{z:04d}_{modality}.png"
            Image.fromarray(gray, mode="L").save(out_path, format="PNG", optimize=True)
            png_paths[z][modality] = out_path
            modalities_urls[modality] = build_public_upload_url(
                backend_public_url, out_path
            )

        valid_slice_previews.append(
            {
                "z": z,
                "sliceNumber": z,
                "modalities": modalities_urls,
            }
        )

    return png_paths, valid_slice_previews


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


def export_mask_nifti(
    masks_by_z: dict[int, np.ndarray],
    slice_filter: dict,
    output_path: Path,
    backend_public_url: str | None,
) -> str | None:
    """Combine 2D masks into one 3D NIfTI (same slice indices as the viewer)."""
    if not masks_by_z:
        return None

    reference_path = slice_filter.get("referenceNiftiPath")
    reference_depth = int(slice_filter.get("reference_depth", 0))
    if not reference_path:
        return None

    save_mask_volume_nifti(
        masks_by_z,
        reference_path=reference_path,
        output_path=output_path,
        reference_depth=reference_depth,
    )
    return build_public_upload_url(backend_public_url, output_path)
