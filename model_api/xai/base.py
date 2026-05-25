from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

from .exceptions import (
    ExplanationGenerationError,
    InvalidTargetLayerError,
    InvalidXaiMethodError,
)
from .gradcam import compute_gradcam
from .gradcam_pp import compute_gradcam_pp
from .integrated_gradients import compute_integrated_gradients
from .saliency import compute_vanilla_saliency
from .utils import find_last_conv2d_layer, normalize_heatmap, resolve_target_layer

XaiMethod = Literal["gradcam", "gradcam++", "integrated_gradients", "vanilla_saliency"]

XAI_METHODS: tuple[XaiMethod, ...] = (
    "gradcam",
    "gradcam++",
    "integrated_gradients",
    "vanilla_saliency",
)


@dataclass(frozen=True)
class ExplanationMaps:
    """Normalized 2D maps in [0, 1] with shape (IMG_H, IMG_W)."""

    heatmap: np.ndarray
    method: XaiMethod
    target_class_index: int
    target_layer_name: str | None
    reduction: str


def generate_explanation(
    model,
    input_tensor,
    method: XaiMethod,
    class_index: int,
    *,
    target_layer: str | None = None,
    ig_steps: int = 50,
    attribution_reduction: Literal["mean", "max"] = "mean",
) -> ExplanationMaps:
    """
    Unified XAI entry point for Keras classification models.

    Args:
        model: Loaded Keras model (not compiled required).
        input_tensor: Batch tensor (1, H, W, C) float32.
        method: One of gradcam | gradcam++ | integrated_gradients | vanilla_saliency.
        class_index: Target output neuron index.
        target_layer: Optional Conv2D layer name (Grad-CAM methods only).
        ig_steps: Integration steps for Integrated Gradients.
        attribution_reduction: Channel reduction for IG / saliency maps.
    """
    if method not in XAI_METHODS:
        raise InvalidXaiMethodError(
            f"Invalid xai method '{method}'. Supported: {', '.join(XAI_METHODS)}"
        )

    try:
        if method == "gradcam":
            layer = resolve_target_layer(model, target_layer)
            heatmap = compute_gradcam(model, input_tensor, class_index, layer.name)
            layer_name = layer.name
        elif method == "gradcam++":
            layer = resolve_target_layer(model, target_layer)
            heatmap = compute_gradcam_pp(model, input_tensor, class_index, layer.name)
            layer_name = layer.name
        elif method == "integrated_gradients":
            heatmap = compute_integrated_gradients(
                model,
                input_tensor,
                class_index,
                steps=ig_steps,
                reduction=attribution_reduction,
            )
            layer_name = None
        elif method == "vanilla_saliency":
            heatmap = compute_vanilla_saliency(
                model,
                input_tensor,
                class_index,
                reduction=attribution_reduction,
            )
            layer_name = None
        else:
            raise InvalidXaiMethodError(f"Unhandled method: {method}")
    except InvalidTargetLayerError:
        raise
    except Exception as exc:
        raise ExplanationGenerationError(
            f"Failed to generate '{method}' explanation: {exc}"
        ) from exc

    heatmap = normalize_heatmap(heatmap)

    if heatmap.shape != (input_tensor.shape[1], input_tensor.shape[2]):
        raise ExplanationGenerationError(
            f"Heatmap shape {heatmap.shape} does not match input spatial size "
            f"{input_tensor.shape[1:3]}"
        )

    return ExplanationMaps(
        heatmap=heatmap,
        method=method,
        target_class_index=class_index,
        target_layer_name=layer_name,
        reduction=attribution_reduction,
    )


def auto_detect_conv_layer(model):
    return find_last_conv2d_layer(model)
