from __future__ import annotations

from pathlib import Path

import numpy as np
from tensorflow.keras.preprocessing.image import img_to_array, load_img

from .config import IMG_HEIGHT, IMG_WIDTH, MODALITY_ORDER, SLOT_TO_MODALITY
from .schemas import ScanFileIn

IMAGE_FORMATS = {"png", "jpg", "jpeg"}


def _load_png_like(path: Path) -> np.ndarray:
    image = load_img(
        path,
        color_mode="grayscale",
        target_size=(IMG_HEIGHT, IMG_WIDTH),
    )
    array = img_to_array(image)[:, :, 0].astype("float32") / 255.0
    return array


def _load_nifti_middle_slice(path: Path) -> np.ndarray:
    try:
        import nibabel as nib
    except ImportError as exc:
        raise RuntimeError(
            "nibabel is required to read .nii / .nii.gz files. Install model_api requirements."
        ) from exc

    volume = np.asarray(nib.load(str(path)).get_fdata(dtype=np.float32))
    if volume.ndim < 3:
        raise ValueError(f"NIfTI volume has unexpected shape: {volume.shape}")

    slice_2d = volume[:, :, volume.shape[2] // 2]
    slice_2d = np.squeeze(slice_2d)

    if slice_2d.ndim != 2:
        raise ValueError(f"Could not extract a 2D slice from NIfTI file: {path}")

    slice_2d = _normalize_to_unit_interval(slice_2d)
    return _resize_grayscale_array(slice_2d)


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

    pixels = _normalize_to_unit_interval(pixels)
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

    normalized_format = file_format.lower().replace(".", "")

    if normalized_format in IMAGE_FORMATS:
        return _load_png_like(resolved)
    if normalized_format in {"nii", "nii.gz"}:
        return _load_nifti_middle_slice(resolved)
    if normalized_format == "dcm":
        return _load_dicom_slice(resolved)

    raise ValueError(f"Unsupported file format: {file_format}")


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
