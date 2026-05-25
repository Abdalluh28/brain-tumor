from __future__ import annotations

import time
from typing import Literal

import numpy as np
import tensorflow as tf

from .schemas import ScanFileIn, XaiExplainResponse, XaiImageOut, XaiMetadataOut
from .xai.base import XaiMethod, generate_explanation
from .xai.exceptions import (
    ExplanationGenerationError,
    InvalidTargetLayerError,
    InvalidXaiMethodError,
    UnsupportedStageError,
)
from .xai.registry import (
    load_stage_model,
    predict_stage,
    prepare_stage_input,
    resolve_display_channel_index,
)
from .xai.utils import (
    array_to_base64_png,
    blend_overlay,
    extract_display_channel,
    heatmap_to_rgb,
)

AttributionReduction = Literal["mean", "max"]


def run_stage_xai(
    files: list[ScanFileIn],
    *,
    stage: int = 2,
    xai_method: XaiMethod = "gradcam",
    target_class: int | None = None,
    target_layer: str | None = None,
    display_channel: int | str | None = None,
    ig_steps: int = 50,
    attribution_reduction: AttributionReduction = "mean",
) -> XaiExplainResponse:
    started = time.perf_counter()

    model, config = load_stage_model(stage)
    input_tensor = prepare_stage_input(files, config)

    predicted_index, predicted_label, probabilities, raw_probs = predict_stage(
        model, input_tensor, config
    )

    class_index = predicted_index if target_class is None else int(target_class)
    if class_index < 0 or class_index >= len(config.class_labels):
        raise ValueError(
            f"target_class {class_index} out of range for stage {stage} "
            f"(0-{len(config.class_labels) - 1})"
        )

    batch = tf.constant(np.expand_dims(input_tensor, axis=0), dtype=tf.float32)

    try:
        explanation = generate_explanation(
            model,
            batch,
            xai_method,
            class_index,
            target_layer=target_layer,
            ig_steps=ig_steps,
            attribution_reduction=attribution_reduction,
        )
    except InvalidXaiMethodError:
        raise
    except InvalidTargetLayerError:
        raise
    except UnsupportedStageError:
        raise
    except ExplanationGenerationError:
        raise
    except Exception as exc:
        raise ExplanationGenerationError(str(exc)) from exc

    display_index, display_modality = resolve_display_channel_index(
        config, display_channel
    )
    grayscale = extract_display_channel(batch.numpy(), display_index)
    heatmap = explanation.heatmap
    overlay_rgb = blend_overlay(grayscale, heatmap)
    heatmap_rgb = heatmap_to_rgb(heatmap)

    metadata = XaiMetadataOut(
        stage=stage,
        stageLabels=list(config.class_labels),
        inputShape=list(input_tensor.shape),
        displayModality=display_modality,
        displayChannelIndex=display_index,
        targetLayer=explanation.target_layer_name,
        attributionReduction=attribution_reduction,
        igSteps=ig_steps if xai_method == "integrated_gradients" else None,
        processingTimeMs=round((time.perf_counter() - started) * 1000, 2),
        rawProbabilities={
            label: float(value) for label, value in zip(config.class_labels, raw_probs)
        },
    )

    return XaiExplainResponse(
        stage=stage,
        xaiMethod=xai_method,
        predictedLabel=predicted_label,
        predictedIndex=predicted_index,
        targetClassIndex=class_index,
        targetClassLabel=config.class_labels[class_index],
        probabilities=probabilities,
        displayChannel=display_index,
        displayModality=display_modality,
        images=XaiImageOut(
            original=array_to_base64_png(grayscale),
            heatmap=array_to_base64_png(heatmap_rgb),
            overlay=array_to_base64_png(overlay_rgb),
        ),
        metadata=metadata,
    )
