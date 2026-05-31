from __future__ import annotations

from pathlib import Path

import numpy as np
from tensorflow.keras.preprocessing.image import img_to_array, load_img

from .config import IMG_HEIGHT, IMG_WIDTH, MODALITY_ORDER, SLOT_TO_MODALITY
from .schemas import ScanFileIn

IMAGE_FORMATS = {"png", "jpg", "jpeg"}
VOLUME_FORMATS = {"nii", "nii.gz", "dcm"}


def _load_png_like(path: Path) -> np.ndarray:
    image = load_img(
        path,
        color_mode="grayscale",
        target_size=(IMG_HEIGHT, IMG_WIDTH),
    )
    array = img_to_array(image)[:, :, 0].astype("float32") / 255.0
    return array


def _central_slice(array: np.ndarray, source: Path) -> np.ndarray:
    array = np.asarray(array, dtype=np.float32)
    array = np.squeeze(array)

    if array.ndim < 2:
        raise ValueError(f"Could not extract a 2D slice from 3D file: {source}")

    while array.ndim > 3:
        array = np.take(array, array.shape[-1] // 2, axis=-1)
        array = np.squeeze(array)

    if array.ndim == 3:
        slice_axis = int(np.argmax(array.shape))
        array = np.take(array, array.shape[slice_axis] // 2, axis=slice_axis)
        array = np.squeeze(array)

    if array.ndim != 2:
        raise ValueError(f"Could not extract a 2D slice from 3D file: {source}")

    return array


def _load_nifti_middle_slice(path: Path) -> np.ndarray:
    try:
        import nibabel as nib
    except ImportError as exc:
        raise RuntimeError(
            "nibabel is required to read .nii / .nii.gz files. Install model_api requirements."
        ) from exc

    volume = np.asarray(nib.load(str(path)).get_fdata(dtype=np.float32))
    slice_2d = _normalize_to_unit_interval(_central_slice(volume, path))
    return _resize_grayscale_array(slice_2d)


def _load_nifti_volume(path: Path) -> np.ndarray:
    from .nifti_volume import load_nifti_volume_viewer_aligned

    volume, _, _ = load_nifti_volume_viewer_aligned(path)
    return volume


def _load_dicom_slice(path: Path) -> np.ndarray:
    try:
        import pydicom
    except ImportError as exc:
        raise RuntimeError(
            "pydicom is required to read .dcm files. Install model_api requirements."
        ) from exc

    dataset = pydicom.dcmread(str(path))
    pixels = dataset.pixel_array.astype(np.float32)

    if hasattr(dataset, "RescaleSlope"):
        pixels = pixels * float(dataset.RescaleSlope)
    if hasattr(dataset, "RescaleIntercept"):
        pixels = pixels + float(dataset.RescaleIntercept)

    pixels = _normalize_to_unit_interval(_central_slice(pixels, path))
    return _resize_grayscale_array(pixels)


def _normalize_to_unit_interval(array: np.ndarray) -> np.ndarray:
    array = array.astype(np.float32)
    minimum = float(array.min())
    maximum = float(array.max())

    if maximum <= minimum:
        return np.zeros_like(array, dtype=np.float32)

    return (array - minimum) / (maximum - minimum)


def _resize_grayscale_array(array: np.ndarray) -> np.ndarray:
    from PIL import Image

    image = Image.fromarray((array * 255.0).astype(np.uint8))
    image = image.resize((IMG_WIDTH, IMG_HEIGHT), Image.Resampling.BILINEAR)
    return np.asarray(image, dtype=np.float32) / 255.0


def load_modality_slice(path: str | Path, file_format: str) -> np.ndarray:
    resolved = Path(path)
    if not resolved.exists():
        raise FileNotFoundError(f"Input file not found: {resolved}")

    normalized_format = file_format.lower().lstrip(".")

    if normalized_format in IMAGE_FORMATS:
        return _load_png_like(resolved)
    if normalized_format in {"nii", "nii.gz"}:
        return _load_nifti_middle_slice(resolved)
    if normalized_format == "dcm":
        return _load_dicom_slice(resolved)

    raise ValueError(f"Unsupported file format: {file_format}")


def load_modality_volume(path: str | Path, file_format: str) -> np.ndarray:
    resolved = Path(path)
    if not resolved.exists():
        raise FileNotFoundError(f"Input file not found: {resolved}")

    normalized_format = file_format.lower().lstrip(".")

    if normalized_format in IMAGE_FORMATS:
        return _load_png_like(resolved)[:, :, np.newaxis]
    if normalized_format in {"nii", "nii.gz"}:
        return _load_nifti_volume(resolved)
    if normalized_format == "dcm":
        return _load_dicom_slice(resolved)[:, :, np.newaxis]

    raise ValueError(f"Unsupported file format: {file_format}")


def validate_matching_volume_shapes(
    volume_map: dict[str, np.ndarray],
    *,
    reference_modality: str = "t1c",
) -> None:
    """Ensure all modality volumes share the same (H, W, Z) shape."""
    if reference_modality not in volume_map:
        raise ValueError(f"Reference modality '{reference_modality}' is missing.")

    reference_shape = volume_map[reference_modality].shape
    mismatched = {
        modality: volume.shape
        for modality, volume in volume_map.items()
        if volume.shape != reference_shape
    }
    if mismatched:
        details = ", ".join(
            f"{modality}={shape}" for modality, shape in mismatched.items()
        )
        raise ValueError(
            f"All modality volumes must match {reference_modality} shape "
            f"{reference_shape}. Mismatched: {details}"
        )


def map_files_to_modalities(files: list[ScanFileIn]) -> dict[str, ScanFileIn]:
    if len(files) != 4:
        raise ValueError("Exactly 4 modality files are required.")

    mapped: dict[str, ScanFileIn] = {}

    for index, scan_file in enumerate(files):
        modality = SLOT_TO_MODALITY.get(scan_file.slot or (index + 1))
        if modality is None:
            raise ValueError(f"Invalid modality slot: {scan_file.slot}")
        if modality in mapped:
            raise ValueError(f"Duplicate modality slot received for {modality}.")
        mapped[modality] = scan_file

    missing = [mod for mod in MODALITY_ORDER if mod not in mapped]
    if missing:
        raise ValueError(f"Missing required modalities: {', '.join(missing)}")

    return mapped


def build_multichannel_tensor(
    modality_map: dict[str, ScanFileIn],
    modalities: list[str],
) -> np.ndarray:
    channels = []

    for modality in modalities:
        scan_file = modality_map[modality]
        channels.append(load_modality_slice(scan_file.rawPath, scan_file.format))

    return np.stack(channels, axis=-1).astype(np.float32)


def get_brain_area_mask(img2d, q=20, *, background_cutoff: float = 0.02):
    """
    Brain tissue mask for slice filtering.

    Uses intensity above a low background cutoff (not merely non-empty image),
    then a percentile threshold within tissue so peripheral / empty slices have
    a small brain_area count (< min_brain_pixels).
    """
    array = img2d.astype(np.float32)
    tissue = array > background_cutoff
    if int(tissue.sum()) < 100:
        return np.zeros_like(array, dtype=bool)

    vals = array[tissue]
    thr = float(np.percentile(vals, q))
    thr = max(thr, background_cutoff)
    return tissue & (array >= thr)


def largest_component_size(mask):
    try:
        from scipy import ndimage
        labeled, num = ndimage.label(mask)
        if num == 0:
            return 0
        sizes = ndimage.sum(mask, labeled, range(1, num + 1))
        return int(np.max(sizes))
    except Exception:
        return int(mask.sum())


def keep_largest_continuous_block(z_list):
    if not z_list:
        return []

    z_list = sorted(z_list)
    blocks = []
    block = [z_list[0]]

    for z in z_list[1:]:
        if z == block[-1] + 1:
            block.append(z)
        else:
            blocks.append(block)
            block = [z]

    blocks.append(block)
    return max(blocks, key=len)


def fallback_top_brain_slices(slice_info, k=5):
    rows = sorted(slice_info, key=lambda r: r["brain_area"], reverse=True)
    return [r["z"] for r in rows[:k]]


def filter_slices_by_brain_size(
    mri_for_brainmask,
    q=20,
    min_brain_pixels=8000,
    min_component_pixels=2000,
    edge_margin_ratio=0.08,
    edge_relax_factor=1.0,
):
    """
    Mark slices as good only when brain tissue is large enough.

    A slice is bad when brain_area < min_brain_pixels (default 8000) OR when the
    largest connected brain component is too small — not only when the slice is
  empty background.
    """
    _, _, z_depth = mri_for_brainmask.shape
    results = []
    good_slices = []
    bad_slices = []

    for z in range(z_depth):
        img2d = mri_for_brainmask[:, :, z]
        brain_mask = get_brain_area_mask(img2d, q=q)

        brain_area = int(brain_mask.sum())
        largest_cc = int(largest_component_size(brain_mask))
        z_rel = z / max(z_depth - 1, 1)
        is_edge = (z_rel < edge_margin_ratio) or (z_rel > (1.0 - edge_margin_ratio))

        local_min_brain = (
            int(min_brain_pixels * edge_relax_factor)
            if is_edge
            else int(min_brain_pixels)
        )
        meets_brain_size = brain_area >= local_min_brain
        meets_component = largest_cc >= min_component_pixels
        is_good = meets_brain_size and meets_component

        row = {
            "z": z,
            "brain_area": brain_area,
            "largest_component": largest_cc,
            "z_rel": z_rel,
            "is_edge": is_edge,
            "threshold_used": local_min_brain,
            "min_brain_pixels": int(min_brain_pixels),
            "min_component_pixels": int(min_component_pixels),
            "meets_brain_size": bool(meets_brain_size),
            "meets_component": bool(meets_component),
            "is_good": bool(is_good),
            "slice_status": "good" if is_good else "bad",
            "reject_reason": (
                None
                if is_good
                else (
                    "brain_area_below_threshold"
                    if not meets_brain_size
                    else "component_below_threshold"
                )
            ),
        }
        results.append(row)

        if is_good:
            good_slices.append(z)
        else:
            bad_slices.append(z)

    return results, good_slices, bad_slices


def validate_2d_mri_brain_size(t1c_slice: np.ndarray) -> dict:
    """
    Apply the same T1c brain-size rules as 3D volumes to a single 2D slice.

    Raises ValueError when brain_area < min_brain_pixels (default 8000) so empty /
    background-only uploads are rejected before classification.
    """
    from .config import (
        MIN_BRAIN_COMPONENT_PIXELS_FOR_SLICE_FILTER,
        MIN_BRAIN_PIXELS_FOR_SLICE_FILTER,
        SLICE_FILTER_BRAIN_PERCENTILE,
        SLICE_FILTER_EDGE_MARGIN_RATIO,
        SLICE_FILTER_EDGE_RELAX_FACTOR,
    )

    volume = np.asarray(t1c_slice, dtype=np.float32)
    if volume.ndim != 2:
        raise ValueError("T1c slice must be a 2D image for brain-size validation.")

    slice_info, good_slices, bad_slices = filter_slices_by_brain_size(
        volume[:, :, np.newaxis],
        q=SLICE_FILTER_BRAIN_PERCENTILE,
        min_brain_pixels=MIN_BRAIN_PIXELS_FOR_SLICE_FILTER,
        min_component_pixels=MIN_BRAIN_COMPONENT_PIXELS_FOR_SLICE_FILTER,
        edge_margin_ratio=SLICE_FILTER_EDGE_MARGIN_RATIO,
        edge_relax_factor=SLICE_FILTER_EDGE_RELAX_FACTOR,
    )

    if not good_slices:
        row = slice_info[0]
        brain_area = int(row.get("brain_area", 0))
        minimum = int(MIN_BRAIN_PIXELS_FOR_SLICE_FILTER)
        reason = row.get("reject_reason") or "brain_area_below_threshold"
        raise ValueError(
            "Scan rejected: T1c image does not contain enough brain tissue for analysis. "
            f"Detected brain area is {brain_area} pixels (minimum required: {minimum}; "
            f"reason: {reason}). Upload slices with visible brain anatomy, not "
            "background-only images."
        )

    return {
        "slice_info": slice_info,
        "good_slices": good_slices,
        "bad_slices": bad_slices,
        "min_brain_pixels": int(MIN_BRAIN_PIXELS_FOR_SLICE_FILTER),
        "min_component_pixels": int(MIN_BRAIN_COMPONENT_PIXELS_FOR_SLICE_FILTER),
        "reference_modality": "t1c",
    }


def select_slices_for_classification(
    t1c_volume,
    q: int | None = None,
    min_brain_pixels: int | None = None,
    min_component_pixels: int | None = None,
    edge_margin_ratio: float | None = None,
    edge_relax_factor: float | None = None,
    use_largest_block=True,
    fallback_k=5,
):
    from .config import (
        MIN_BRAIN_COMPONENT_PIXELS_FOR_SLICE_FILTER,
        MIN_BRAIN_PIXELS_FOR_SLICE_FILTER,
        SLICE_FILTER_BRAIN_PERCENTILE,
        SLICE_FILTER_EDGE_MARGIN_RATIO,
        SLICE_FILTER_EDGE_RELAX_FACTOR,
    )

    q = SLICE_FILTER_BRAIN_PERCENTILE if q is None else q
    min_brain_pixels = (
        MIN_BRAIN_PIXELS_FOR_SLICE_FILTER
        if min_brain_pixels is None
        else min_brain_pixels
    )
    min_component_pixels = (
        MIN_BRAIN_COMPONENT_PIXELS_FOR_SLICE_FILTER
        if min_component_pixels is None
        else min_component_pixels
    )
    edge_margin_ratio = (
        SLICE_FILTER_EDGE_MARGIN_RATIO
        if edge_margin_ratio is None
        else edge_margin_ratio
    )
    edge_relax_factor = (
        SLICE_FILTER_EDGE_RELAX_FACTOR
        if edge_relax_factor is None
        else edge_relax_factor
    )

    slice_info, good_slices, bad_slices = filter_slices_by_brain_size(
        mri_for_brainmask=t1c_volume,
        q=q,
        min_brain_pixels=min_brain_pixels,
        min_component_pixels=min_component_pixels,
        edge_margin_ratio=edge_margin_ratio,
        edge_relax_factor=edge_relax_factor,
    )

    if use_largest_block and len(good_slices) > 0:
        good_slices = keep_largest_continuous_block(good_slices)

    if len(good_slices) == 0:
        max_brain_area = max((r["brain_area"] for r in slice_info), default=0)
        raise ValueError(
            "No T1c slices met the brain-size filter for classification "
            f"(minimum brain area: {min_brain_pixels} pixels; "
            f"largest detected brain area: {max_brain_area} pixels)."
        )

    bad_slices = [r["z"] for r in slice_info if r["z"] not in set(good_slices)]

    return {
        "slice_info": slice_info,
        "good_slices": good_slices,
        "bad_slices": bad_slices,
        "min_brain_pixels": int(min_brain_pixels),
        "min_component_pixels": int(min_component_pixels),
        "reference_modality": "t1c",
    }
