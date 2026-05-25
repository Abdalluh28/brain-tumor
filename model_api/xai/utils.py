from __future__ import annotations

import base64
import io
from typing import Literal

import keras
import numpy as np
import tensorflow as tf
from PIL import Image

from .exceptions import InvalidTargetLayerError

IMG_HEIGHT = 240
IMG_WIDTH = 240

# Matplotlib "jet" inspired colormap (no matplotlib runtime dep for heatmaps).
_HEATMAP_COLORS = np.array(
    [
        [0, 0, 128],
        [0, 0, 255],
        [0, 255, 255],
        [0, 255, 0],
        [255, 255, 0],
        [255, 0, 0],
        [128, 0, 0],
    ],
    dtype=np.float32,
)


def _iter_layers(model):
    for layer in model.layers:
        yield layer
        if isinstance(layer, keras.Model):
            yield from _iter_layers(layer)


def _model_inputs(model):
    """Return the input tensor(s) used to build a Grad-CAM subgraph."""
    if getattr(model, "inputs", None):
        inputs = model.inputs
        if isinstance(inputs, (list, tuple)) and len(inputs) == 1:
            return inputs[0]
        return inputs
    if getattr(model, "input", None) is not None:
        return model.input
    raise InvalidTargetLayerError("Model has no input tensor for Grad-CAM.")


def find_layer_by_name(model, name: str) -> keras.layers.Layer | None:
    """Find a layer by name in the top-level model or nested submodels."""
    for layer in _iter_layers(model):
        if layer.name == name:
            return layer
    return None


def _is_conv2d_layer(layer) -> bool:
    """Detect Conv2D layers across Keras versions / saved-model class paths."""
    if isinstance(layer, (keras.layers.Conv2D, keras.layers.Conv2DTranspose)):
        return True
    return layer.__class__.__name__ in ("Conv2D", "Conv2DTranspose")


def find_last_conv2d_layer(model) -> keras.layers.Layer:
    last_conv = None
    for layer in _iter_layers(model):
        if _is_conv2d_layer(layer):
            last_conv = layer
    if last_conv is None:
        raise InvalidTargetLayerError("No Conv2D layer found in model.")
    return last_conv


def resolve_target_layer(model, target_layer: str | None) -> keras.layers.Layer:
    if target_layer:
        layer = find_layer_by_name(model, target_layer)
        if layer is None:
            raise InvalidTargetLayerError(
                f"Layer '{target_layer}' not found in model."
            )
        return layer
    return find_last_conv2d_layer(model)


def _find_nested_container(
    model,
    target_layer: keras.layers.Layer,
) -> keras.Model | None:
    """Return the direct child submodel that owns target_layer, if any."""
    for layer in model.layers:
        if not isinstance(layer, keras.Model):
            continue
        for sub in _iter_layers(layer):
            if sub is target_layer:
                return layer
    return None


def build_gradcam_combined_model(
    model,
    conv_layer: keras.layers.Layer,
) -> keras.Model:
    """
    Single forward graph: [conv feature map, class logits].

    Nested Functional backbones (e.g. stage 3 DenseNet) cannot expose an internal
    conv tensor from the top-level input in one Model(); we chain pre-layers,
    a backbone submodel, then post-layers so gradients reach the conv map.
    """
    container = _find_nested_container(model, conv_layer)
    inputs = _model_inputs(model)

    if container is None:
        return keras.models.Model(
            inputs=inputs,
            outputs=[conv_layer.output, model.output],
            name="gradcam_combined",
        )

    pre_layers: list[keras.layers.Layer] = []
    post_layers: list[keras.layers.Layer] = []
    past_container = False
    for layer in model.layers:
        if isinstance(layer, keras.layers.InputLayer):
            continue
        if layer is container:
            past_container = True
            continue
        if past_container:
            post_layers.append(layer)
        else:
            pre_layers.append(layer)

    x = inputs
    for layer in pre_layers:
        x = layer(x)

    backbone = keras.models.Model(
        container.input,
        [conv_layer.output, container.output],
        name=f"gradcam_backbone_{container.name}",
    )
    conv_features, x = backbone(x)

    for layer in post_layers:
        x = layer(x)

    return keras.models.Model(
        inputs=inputs,
        outputs=[conv_features, x],
        name="gradcam_combined",
    )


def build_conv_feature_model(model, conv_layer: keras.layers.Layer):
    """Submodel from inputs to a conv feature map (flat models only)."""
    inputs = _model_inputs(model)
    return keras.models.Model(inputs=inputs, outputs=conv_layer.output)


def build_gradcam_model(model, conv_layer: keras.layers.Layer):
    """Combined [conv, logits] graph; prefer build_gradcam_combined_model."""
    return build_gradcam_combined_model(model, conv_layer)


def normalize_heatmap(heatmap: np.ndarray) -> np.ndarray:
    array = np.asarray(heatmap, dtype=np.float32)
    array = np.squeeze(array)
    if array.ndim != 2:
        raise ValueError(f"Expected 2D heatmap, got shape {array.shape}")

    minimum = float(array.min())
    maximum = float(array.max())
    if maximum <= minimum:
        return np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.float32)

    normalized = (array - minimum) / (maximum - minimum)
    return tf.image.resize(
        normalized[..., np.newaxis],
        (IMG_HEIGHT, IMG_WIDTH),
        method="bilinear",
    ).numpy()[..., 0].astype(np.float32)


def reduce_attribution_to_2d(
    attribution,
    reduction: Literal["mean", "max"] = "mean",
) -> np.ndarray:
    """Reduce (H, W, C) attribution to (H, W) using mean or max absolute value."""
    array = np.asarray(attribution, dtype=np.float32)
    if array.ndim == 4:
        array = array[0]
    if array.ndim != 3:
        raise ValueError(f"Expected attribution (H,W,C), got {array.shape}")

    abs_attr = np.abs(array)
    if reduction == "max":
        return np.max(abs_attr, axis=-1)
    return np.mean(abs_attr, axis=-1)


def extract_display_channel(
    input_tensor,
    display_channel: int,
) -> np.ndarray:
    """Return single-channel grayscale map in [0, 1] from batched input."""
    batch = np.asarray(input_tensor, dtype=np.float32)
    if batch.ndim == 4:
        batch = batch[0]

    channel_index = int(display_channel)
    if channel_index < 0 or channel_index >= batch.shape[-1]:
        raise ValueError(
            f"display_channel {display_channel} out of range for "
            f"{batch.shape[-1]} channels"
        )

    channel = batch[:, :, channel_index]
    return np.clip(channel, 0.0, 1.0).astype(np.float32)


def grayscale_to_uint8(grayscale: np.ndarray) -> np.ndarray:
    array = np.clip(grayscale, 0.0, 1.0)
    return (array * 255.0).astype(np.uint8)


def heatmap_to_rgb(heatmap: np.ndarray) -> np.ndarray:
    """Map normalized heatmap [0,1] to RGB uint8."""
    heat = np.clip(heatmap, 0.0, 1.0)
    scaled = heat * (_HEATMAP_COLORS.shape[0] - 1)
    lower = np.floor(scaled).astype(np.int32)
    upper = np.ceil(scaled).astype(np.int32)
    upper = np.clip(upper, 0, _HEATMAP_COLORS.shape[0] - 1)
    lower = np.clip(lower, 0, _HEATMAP_COLORS.shape[0] - 1)
    weight = (scaled - lower)[..., np.newaxis]
    colors = (
        _HEATMAP_COLORS[lower] * (1.0 - weight)
        + _HEATMAP_COLORS[upper] * weight
    )
    return np.clip(colors, 0, 255).astype(np.uint8)


def blend_overlay(
    grayscale: np.ndarray,
    heatmap: np.ndarray,
    alpha: float = 0.45,
) -> np.ndarray:
    base = grayscale_to_uint8(grayscale)
    base_rgb = np.stack([base, base, base], axis=-1)
    heat_rgb = heatmap_to_rgb(heatmap)
    blended = (
        (1.0 - alpha) * base_rgb.astype(np.float32)
        + alpha * heat_rgb.astype(np.float32)
    )
    return np.clip(blended, 0, 255).astype(np.uint8)


def save_png(array: np.ndarray, path) -> None:
    if array.ndim == 2:
        image = Image.fromarray(grayscale_to_uint8(array), mode="L")
    else:
        image = Image.fromarray(array.astype(np.uint8), mode="RGB")
    image.save(path, format="PNG", optimize=True)


def build_public_upload_url(backend_public_url: str | None, absolute_path) -> str:
    from pathlib import Path
    from urllib.parse import quote

    normalized = str(Path(absolute_path)).replace("\\", "/")
    marker = "/uploads/"
    if marker not in normalized:
        return normalized
    relative = normalized.split(marker, 1)[1]
    if not backend_public_url:
        return relative
    return f"{backend_public_url.rstrip('/')}/uploads/{quote(relative)}"


def resolve_xai_output_dir(files, job_id: str):
    import uuid
    from pathlib import Path

    first_path = Path(files[0].rawPath)
    uploads_root = first_path.parent.parent
    folder = job_id or uuid.uuid4().hex
    output_dir = uploads_root / "xai" / folder
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def array_to_base64_png(array: np.ndarray) -> str:
    if array.ndim == 2:
        image = Image.fromarray(grayscale_to_uint8(array), mode="L")
    else:
        image = Image.fromarray(array.astype(np.uint8), mode="RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return base64.b64encode(buffer.getvalue()).decode("ascii")
