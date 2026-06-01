from __future__ import annotations

from pathlib import Path

import numpy as np

from .config import IMG_HEIGHT, IMG_WIDTH
from .preprocessing import _resize_grayscale_array


def _load_nibabel():
    try:
        import nibabel as nib
    except ImportError as exc:
        raise RuntimeError(
            "nibabel is required to read .nii / .nii.gz files. Install model_api requirements."
        ) from exc
    return nib


def _spatial_shape_from_header(header) -> tuple[int, int, int]:
    """NIfTI dims[1]=columns (i), dims[2]=rows (j), dims[3]=slices (k)."""
    dims = header.get_data_shape()
    while len(dims) < 3:
        dims = (*dims, 1)
    return int(dims[0]), int(dims[1]), int(dims[2])


def _transpose_to_shape(data: np.ndarray, target: tuple[int, int, int]) -> np.ndarray:
    if data.shape == target:
        return data
    for perm in (
        (0, 1, 2),
        (0, 2, 1),
        (1, 0, 2),
        (1, 2, 0),
        (2, 0, 1),
        (2, 1, 0),
    ):
        candidate = np.transpose(data, perm)
        if candidate.shape == target:
            return candidate
    raise ValueError(
        f"Cannot align NIfTI array shape {data.shape} to header spatial shape {target}."
    )


def _viewer_flip_slice(slab: np.ndarray) -> np.ndarray:
    """
    Match client mri-viewer drawSlice row order (niftiRow = rows - displayRow - 1).
    Slab is stored as (columns, rows) = (dim1, dim2).
    """
    if slab.ndim != 2:
        raise ValueError(f"Expected 2D slice, got shape {slab.shape}")
    return np.flip(slab, axis=1).astype(np.float32)


def _viewer_unflip_slice(slab: np.ndarray) -> np.ndarray:
    """Reverse _viewer_flip_slice when writing masks back to NIfTI storage order."""
    return np.flip(slab, axis=1)


def load_nifti_volume_viewer_aligned(
    path: str | Path,
) -> tuple[np.ndarray, np.ndarray, tuple[int, int, int]]:
    """
    Load a NIfTI volume so slice index k matches the MRI viewer (slice k / N).

    Returns:
        volume: float32 array (IMG_HEIGHT, IMG_WIDTH, num_slices) for model input
        affine: 4x4 NIfTI affine from the source image
        native_shape: (columns, rows, slices) per NIfTI header dims 1–3
    """
    nib = _load_nibabel()
    resolved = Path(path)
    img = nib.load(str(resolved))
    data = np.asarray(img.get_fdata(dtype=np.float32))
    data = np.squeeze(data)

    while data.ndim > 3:
        data = data[..., 0]
    if data.ndim == 2:
        data = data[:, :, np.newaxis]
    if data.ndim != 3:
        raise ValueError(f"Could not extract a 3D volume from file: {resolved}")

    native_shape = _spatial_shape_from_header(img.header)
    data = _transpose_to_shape(data, native_shape)
    cols, rows, depth = native_shape

    non_zero = data[data > 0]
    if non_zero.size:
        vmin, vmax = np.percentile(non_zero, (1, 99))
    else:
        vmin, vmax = float(data.min()), float(data.max())
    if vmax <= vmin:
        vmax = vmin + 1.0

    slices: list[np.ndarray] = []
    for k in range(depth):
        slab = data[:, :, k]
        slab = _viewer_flip_slice(slab)
        slab = np.clip((slab - vmin) / (vmax - vmin), 0.0, 1.0)
        slices.append(_resize_grayscale_array(slab))

    volume = np.stack(slices, axis=-1).astype(np.float32)
    return volume, np.asarray(img.affine), native_shape


def extract_slice_for_display(
    path: str | Path,
    slice_index: int,
) -> np.ndarray:
    """Extract one viewer-aligned grayscale slice (H, W) in [0, 1]."""
    volume, _, _ = load_nifti_volume_viewer_aligned(path)
    z = int(np.clip(slice_index, 0, volume.shape[-1] - 1))
    return volume[:, :, z]


def save_mask_volume_nifti(
    mask_by_z: dict[int, np.ndarray],
    *,
    reference_path: str | Path,
    output_path: Path,
    reference_depth: int,
) -> None:
    """
    Write a 3D label mask NIfTI aligned with the reference scan's native geometry.
    """
    nib = _load_nibabel()
    ref_img = nib.load(str(reference_path))
    native_shape = _spatial_shape_from_header(ref_img.header)
    cols, rows, depth = native_shape

    if reference_depth != depth:
        depth = reference_depth

    first = next(iter(mask_by_z.values()))
    mask_h, mask_w = first.shape
    native_mask = np.zeros((cols, rows, depth), dtype=np.uint8)

    for z, mask in mask_by_z.items():
        if z < 0 or z >= depth:
            continue
        resized = np.asarray(mask, dtype=np.uint8)
        if resized.shape != (mask_h, mask_w):
            from PIL import Image

            resized = np.asarray(
                Image.fromarray(resized).resize((cols, rows), Image.Resampling.NEAREST),
                dtype=np.uint8,
            )
        elif mask_h != rows or mask_w != cols:
            from PIL import Image

            resized = np.asarray(
                Image.fromarray(resized).resize((cols, rows), Image.Resampling.NEAREST),
                dtype=np.uint8,
            )
        native_mask[:, :, z] = _viewer_unflip_slice(resized)

    nii = nib.Nifti1Image(native_mask, ref_img.affine, ref_img.header)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    nib.save(nii, str(output_path))
