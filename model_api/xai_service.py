from __future__ import annotations

import time
import uuid
from pathlib import Path
from typing import Literal

import numpy as np
import tensorflow as tf

from .pipeline import PipelineResult
from .schemas import (
    CascadeXaiResultOut,
    Prediction,
    ScanFileIn,
    XaiExplainResponse,
    XaiImageOut,
    XaiMetadataOut,
    XaiStageResultOut,
)
from .xai.base import XaiMethod, generate_explanation
from .xai.cascade import (
    resolve_cascade_target_class_index,
    resolve_cascade_xai_stages,
    resolve_stage_class_index,
)
from .xai.exceptions import (
    ExplanationGenerationError,
    InvalidTargetLayerError,
    InvalidXaiMethodError,
    UnsupportedStageError,
)
from .xai.registry import (
    get_stage_config,
    load_stage_model,
    predict_stage,
    prepare_stage_input,
    resolve_display_channel_index,
)
from .xai.utils import (
    array_to_base64_png,
    blend_overlay,
    build_public_upload_url,
    extract_display_channel,
    heatmap_to_rgb,
    resolve_xai_output_dir,
    save_png,
)

AttributionReduction = Literal["mean", "max"]


def _xai_method_filename_slug(method: str) -> str:
    """Safe filename fragment for overlay PNGs (e.g. gradcam++ -> gradcam_pp)."""
    return method.replace("++", "_pp")


def _local_path_for_file(scan_file: ScanFileIn) -> str:
    if scan_file.storagePath and Path(scan_file.storagePath).exists():
        return scan_file.storagePath
    if Path(scan_file.rawPath).exists():
        return scan_file.rawPath
    raise FileNotFoundError(
        f"Local MRI file not found for XAI (slot {scan_file.slot}): {scan_file.rawPath}"
    )


def _scan_files_with_local_paths(files: list[ScanFileIn]) -> list[ScanFileIn]:
    return [
        scan_file.model_copy(
            update={"rawPath": _local_path_for_file(scan_file)},
        )
        for scan_file in files
    ]


def _files_from_scan_document(scan_files: list[dict]) -> list[ScanFileIn]:
    return [
        ScanFileIn(
            rawPath=item.get("rawPath", ""),
            format=item["format"],
            originalName=item.get("originalName"),
            slot=item.get("slot"),
            storagePath=item.get("storagePath"),
        )
        for item in scan_files
    ]


def _build_xai_core(
    files: list[ScanFileIn],
    *,
    stage: int,
    xai_method: XaiMethod,
    target_class: int | None,
    target_layer: str | None,
    display_channel: int | str | None,
    ig_steps: int,
    attribution_reduction: AttributionReduction,
    cascade_prediction: Prediction | None = None,
    pipeline_result: PipelineResult | None = None,
    cascade_class_index: int | None = None,
) -> tuple:
    model, config = load_stage_model(stage)
    local_files = _scan_files_with_local_paths(files)
    input_tensor = prepare_stage_input(local_files, config)

    predicted_index, predicted_label, probabilities, raw_probs = predict_stage(
        model, input_tensor, config
    )

    if target_class is not None:
        class_index = int(target_class)
    elif cascade_class_index is not None:
        class_index = cascade_class_index
    elif pipeline_result is not None and cascade_prediction is not None:
        class_index = resolve_cascade_target_class_index(
            cascade_prediction, pipeline_result
        )
    else:
        class_index = predicted_index

    if class_index < 0 or class_index >= len(config.class_labels):
        raise ValueError(
            f"target_class {class_index} out of range for stage {stage} "
            f"(0-{len(config.class_labels) - 1})"
        )

    effective_target_layer = target_layer or config.gradcam_target_layer

    batch = tf.constant(np.expand_dims(input_tensor, axis=0), dtype=tf.float32)
    explanation = generate_explanation(
        model,
        batch,
        xai_method,
        class_index,
        target_layer=effective_target_layer,
        ig_steps=ig_steps,
        attribution_reduction=attribution_reduction,
    )

    display_index, display_modality = resolve_display_channel_index(
        config, display_channel
    )
    grayscale = extract_display_channel(batch.numpy(), display_index)
    heatmap = explanation.heatmap
    overlay_rgb = blend_overlay(grayscale, heatmap)
    heatmap_rgb = heatmap_to_rgb(heatmap)

    metadata = {
        "stage": stage,
        "stageLabels": list(config.class_labels),
        "inputShape": list(input_tensor.shape),
        "displayModality": display_modality,
        "displayChannelIndex": display_index,
        "targetLayer": explanation.target_layer_name,
        "attributionReduction": attribution_reduction,
        "igSteps": ig_steps if xai_method == "integrated_gradients" else None,
        "rawProbabilities": {
            label: float(value)
            for label, value in zip(config.class_labels, raw_probs, strict=True)
        },
        "stagePredictedLabel": predicted_label,
        "stagePredictedIndex": predicted_index,
    }

    return (
        config,
        class_index,
        predicted_label,
        predicted_index,
        probabilities,
        display_index,
        display_modality,
        grayscale,
        heatmap_rgb,
        overlay_rgb,
        explanation,
        metadata,
    )


def run_cascade_xai(
    files: list[ScanFileIn],
    pipeline_result: PipelineResult,
    *,
    cascade_prediction: Prediction,
    xai_method: XaiMethod = "gradcam++",
    backend_public_url: str | None = None,
    job_id: str | None = None,
    target_layer: str | None = None,
    display_channel: int | str | None = None,
    ig_steps: int = 50,
    attribution_reduction: AttributionReduction = "mean",
) -> CascadeXaiResultOut:
    """
    Generate Grad-CAM++ (or fallback) heatmaps for every stage on the cascade path.

    Healthy -> stage 1 only; Metastasis/Others -> stages 1–2; HGG/LGG -> stages 1–3.
    """
    started = time.perf_counter()
    stages_to_run = resolve_cascade_xai_stages(pipeline_result)
    local_files = _scan_files_with_local_paths(files)
    output_dir = resolve_xai_output_dir(local_files, job_id or uuid.uuid4().hex)
    method_slug = _xai_method_filename_slug(xai_method)

    stage_results: list[XaiStageResultOut] = []

    for stage in stages_to_run:
        class_index = resolve_stage_class_index(stage, pipeline_result)

        try:
            (
                config,
                class_index,
                _predicted_label,
                _predicted_index,
                _probabilities,
                display_index,
                display_modality,
                grayscale,
                heatmap_rgb,
                overlay_rgb,
                _explanation,
                metadata,
            ) = _build_xai_core(
                files,
                stage=stage,
                xai_method=xai_method,
                target_class=None,
                target_layer=target_layer,
                display_channel=display_channel,
                ig_steps=ig_steps,
                attribution_reduction=attribution_reduction,
                cascade_prediction=None,
                pipeline_result=None,
                cascade_class_index=class_index,
            )
        except (
            InvalidXaiMethodError,
            InvalidTargetLayerError,
            UnsupportedStageError,
            FileNotFoundError,
            ValueError,
        ):
            raise
        except Exception as exc:
            raise ExplanationGenerationError(
                f"Stage {stage} XAI failed: {exc}"
            ) from exc

        original_file = output_dir / f"original_stage{stage}.png"
        heatmap_file = output_dir / f"heatmap_stage{stage}.png"
        overlay_file = output_dir / f"overlay_stage{stage}_{method_slug}.png"

        save_png(grayscale, original_file)
        save_png(heatmap_rgb, heatmap_file)
        save_png(overlay_rgb, overlay_file)

        metadata["cascadePrediction"] = cascade_prediction
        metadata["explainedClassIndex"] = class_index
        metadata["explainedClassLabel"] = config.class_labels[class_index]

        stage_results.append(
            XaiStageResultOut(
                stage=stage,
                targetClassIndex=class_index,
                targetClassLabel=config.class_labels[class_index],
                displayChannel=display_index,
                displayModality=display_modality,
                originalPath=build_public_upload_url(
                    backend_public_url, original_file
                ),
                heatmapPath=build_public_upload_url(
                    backend_public_url, heatmap_file
                ),
                overlayPath=build_public_upload_url(
                    backend_public_url, overlay_file
                ),
                metadata=metadata,
            )
        )

    total_ms = round((time.perf_counter() - started) * 1000, 2)
    for result in stage_results:
        result.metadata["processingTimeMs"] = total_ms
        result.metadata["stagesExplained"] = stages_to_run

    return CascadeXaiResultOut(
        xaiMethod=xai_method,
        cascadePrediction=cascade_prediction,
        stages=stage_results,
    )


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

    try:
        (
            config,
            class_index,
            predicted_label,
            predicted_index,
            probabilities,
            display_index,
            display_modality,
            grayscale,
            heatmap_rgb,
            overlay_rgb,
            explanation,
            metadata,
        ) = _build_xai_core(
            files,
            stage=stage,
            xai_method=xai_method,
            target_class=target_class,
            target_layer=target_layer,
            display_channel=display_channel,
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

    metadata["processingTimeMs"] = round((time.perf_counter() - started) * 1000, 2)

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
        metadata=XaiMetadataOut(
            stage=metadata["stage"],
            stageLabels=metadata["stageLabels"],
            inputShape=metadata["inputShape"],
            displayModality=metadata["displayModality"],
            displayChannelIndex=metadata["displayChannelIndex"],
            targetLayer=metadata.get("targetLayer"),
            attributionReduction=metadata["attributionReduction"],
            igSteps=metadata.get("igSteps"),
            processingTimeMs=metadata["processingTimeMs"],
            rawProbabilities=metadata["rawProbabilities"],
        ),
    )


def rerun_scan_xai_from_document(
    scan: dict,
    *,
    xai_method: XaiMethod,
    backend_public_url: str | None,
    target_class: int | None = None,
    target_layer: str | None = None,
    display_channel: int | str | None = None,
    ig_steps: int = 50,
    attribution_reduction: AttributionReduction = "mean",
) -> CascadeXaiResultOut:
    """Re-run multi-stage cascade XAI for an existing scan (no segmentation)."""
    from .pipeline import PipelineResult, StagePrediction

    files = _files_from_scan_document(scan["files"])
    prediction = scan["prediction"]
    stages_to_run, stage_details = _resolve_stages_for_rerun(scan, prediction)

    pipeline_result = PipelineResult(
        prediction=prediction,
        confidence=float(scan.get("confidence", 0)),
        confidence_scores=scan.get("confidenceScores", {}),
        stages_run=[f"stage{n}" for n in stages_to_run],
        stage_details=stage_details,
    )

    if target_class is not None:
        final_stage = stages_to_run[-1]
        stage_key = f"stage{final_stage}"
        labels = stage_details[stage_key].probabilities.keys()
        label_list = list(labels)
        idx = int(target_class)
        if 0 <= idx < len(label_list):
            stage_details[stage_key] = StagePrediction(
                label=label_list[idx],
                confidence=stage_details[stage_key].confidence,
                probabilities=stage_details[stage_key].probabilities,
            )

    return run_cascade_xai(
        files,
        pipeline_result,
        cascade_prediction=prediction,
        xai_method=xai_method,
        backend_public_url=backend_public_url,
        job_id=str(scan.get("_id", uuid.uuid4().hex)),
        target_layer=target_layer,
        display_channel=display_channel,
        ig_steps=ig_steps,
        attribution_reduction=attribution_reduction,
    )


def _resolve_stages_for_rerun(
    scan: dict,
    prediction: Prediction,
) -> tuple[list[int], dict]:
    """Build stage list and synthetic stage_details when DB lacks pipeline info."""
    from .pipeline import StagePrediction

    existing = scan.get("xai")
    if isinstance(existing, dict) and existing.get("stages"):
        stages = [int(item["stage"]) for item in existing["stages"]]
        stage_details = {}
        for item in existing["stages"]:
            key = f"stage{item['stage']}"
            label = item.get("targetClassLabel") or item.get("metadata", {}).get(
                "explainedClassLabel"
            )
            if label:
                stage_details[key] = StagePrediction(
                    label=label,
                    confidence=1.0,
                    probabilities={label: 1.0},
                )
        if len(stage_details) == len(stages):
            return stages, stage_details

    if prediction == "Healthy":
        stages = [1]
    elif prediction in ("Metastasis", "Others"):
        stages = [1, 2]
    else:
        stages = [1, 2, 3]

    stage_details = {}
    if 1 in stages:
        stage_details["stage1"] = StagePrediction(
            label="Healthy" if prediction == "Healthy" else "Tumor",
            confidence=1.0,
            probabilities={"Healthy": 0.5, "Tumor": 0.5},
        )
    if 2 in stages:
        label = (
            "METS"
            if prediction == "Metastasis"
            else "OTHER"
            if prediction == "Others"
            else "GLI"
        )
        stage_details["stage2"] = StagePrediction(
            label=label,
            confidence=1.0,
            probabilities={"GLI": 0.34, "METS": 0.33, "OTHER": 0.33},
        )
    if 3 in stages:
        label = "HGG" if prediction == "HGG" else "LGG"
        stage_details["stage3"] = StagePrediction(
            label=label,
            confidence=1.0,
            probabilities={"HGG": 0.5, "LGG": 0.5},
        )

    return stages, stage_details
