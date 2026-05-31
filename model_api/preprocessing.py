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
    try:
        import nibabel as nib
    except ImportError as exc:
        raise RuntimeError(
            "nibabel is required to read .nii / .nii.gz files. Install model_api requirements."
        ) from exc

    volume = np.asarray(nib.load(str(path)).get_fdata(dtype=np.float32))
    volume = np.squeeze(volume)

    while volume.ndim > 3:
        volume = np.take(volume, volume.shape[-1] // 2, axis=-1)
        volume = np.squeeze(volume)

    if volume.ndim == 2:
        volume = volume[:, :, np.newaxis]
    if volume.ndim != 3:
        raise ValueError(f"Could not extract a 3D volume from file: {path}")

    slice_axis = int(np.argmax(volume.shape))
    volume = np.moveaxis(volume, slice_axis, -1)
    normalized = _normalize_to_unit_interval(volume)
    slices = [
        _resize_grayscale_array(normalized[:, :, z])
        for z in range(normalized.shape[-1])
    ]
    return np.stack(slices, axis=-1).astype(np.float32)


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


def get_brain_area_mask(img2d, q=20):
    nz = img2d[img2d > 0]
    if nz.size == 0:
        return np.zeros_like(img2d, dtype=bool)
    thr = np.percentile(nz, q)
    return img2d > thr


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
    edge_relax_factor=1.0
):
    _, _, Z = mri_for_brainmask.shape
    results = []
    good_slices = []
    bad_slices = []

    for z in range(Z):
        img2d = mri_for_brainmask[:, :, z]
        brain_mask = get_brain_area_mask(img2d, q=q)

        brain_area = int(brain_mask.sum())
        largest_cc = int(largest_component_size(brain_mask))
        z_rel = z / max(Z - 1, 1)
        is_edge = (z_rel < edge_margin_ratio) or (z_rel > (1.0 - edge_margin_ratio))

        local_min_brain = (
            int(min_brain_pixels * edge_relax_factor)
            if is_edge
            else min_brain_pixels
        )
        is_good = (brain_area >= local_min_brain) and (largest_cc >= min_component_pixels)

        row = {
            "z": z,
            "brain_area": brain_area,
            "largest_component": largest_cc,
            "z_rel": z_rel,
            "is_edge": is_edge,
            "threshold_used": local_min_brain,
            "is_good": bool(is_good),
            "slice_status": "good" if is_good else "bad"
        }
        results.append(row)

        if is_good:
            good_slices.append(z)
        else:
            bad_slices.append(z)

    return results, good_slices, bad_slices


def select_slices_for_classification(
    t1c_volume,
    q=20,
    min_brain_pixels=8000,
    min_component_pixels=2000,
    edge_margin_ratio=0.08,
    edge_relax_factor=1.0,
    use_largest_block=True,
    fallback_k=5
):
    slice_info, good_slices, bad_slices = filter_slices_by_brain_size(
        mri_for_brainmask=t1c_volume,
        q=q,
        min_brain_pixels=min_brain_pixels,
        min_component_pixels=min_component_pixels,
        edge_margin_ratio=edge_margin_ratio,
        edge_relax_factor=edge_relax_factor
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
        "bad_slices": bad_slices
    }
