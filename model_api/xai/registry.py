from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

import keras
import numpy as np

from ..config import (
    IMG_HEIGHT,
    IMG_WIDTH,
    MODALITY_ORDER,
    STAGE1_MODALITIES,
    STAGE1_MODEL_PATH,
    STAGE2_MODEL_PATH,
    STAGE3_MODEL_PATH,
)
from ..preprocessing import build_multichannel_tensor, map_files_to_modalities
from ..schemas import ScanFileIn
from .exceptions import UnsupportedStageError

StageId = Literal[1, 2, 3]

SUPPORTED_XAI_STAGES: frozenset[int] = frozenset({1, 2, 3})


@dataclass(frozen=True)
class StageXaiConfig:
    stage: StageId
    model_path: str
    modalities: tuple[str, ...]
    class_labels: tuple[str, ...]
    default_display_modality: str
    input_channels: int

    @property
    def default_display_channel_index(self) -> int:
        return self.modalities.index(self.default_display_modality)


STAGE_CONFIGS: dict[int, StageXaiConfig] = {
    2: StageXaiConfig(
        stage=2,
        model_path=str(STAGE2_MODEL_PATH),
        modalities=tuple(MODALITY_ORDER),
        class_labels=("GLI", "METS", "OTHER"),
        default_display_modality="t1c",
        input_channels=4,
    ),
    # Reserved for future XAI support (not exposed via API yet).
    1: StageXaiConfig(
        stage=1,
        model_path=str(STAGE1_MODEL_PATH),
        modalities=tuple(STAGE1_MODALITIES),
        class_labels=("Healthy", "Tumor"),
        default_display_modality="t1n",
        input_channels=2,
    ),
    3: StageXaiConfig(
        stage=3,
        model_path=str(STAGE3_MODEL_PATH),
        modalities=tuple(MODALITY_ORDER),
        class_labels=("HGG", "LGG"),
        default_display_modality="t1c",
        input_channels=4,
    ),
}


def get_stage_config(stage: int) -> StageXaiConfig:
    if stage not in STAGE_CONFIGS:
        raise UnsupportedStageError(f"Unknown stage: {stage}")
    if stage not in SUPPORTED_XAI_STAGES:
        raise UnsupportedStageError(
            f"Stage {stage} is not enabled for XAI yet. "
            f"Supported stages: {sorted(SUPPORTED_XAI_STAGES)}"
        )
    return STAGE_CONFIGS[stage]


@lru_cache(maxsize=4)
def load_stage_model(stage: int):
    from pathlib import Path

    config = get_stage_config(stage)

    if not Path(config.model_path).exists():
        raise FileNotFoundError(f"Stage {stage} model not found: {config.model_path}")

    keras.config.enable_unsafe_deserialization()
    model = keras.models.load_model(config.model_path, compile=False)
    return model, config


def resolve_display_channel_index(
    config: StageXaiConfig,
    display_channel: int | str | None,
) -> tuple[int, str]:
    if display_channel is None:
        index = config.default_display_channel_index
        return index, config.modalities[index]

    if isinstance(display_channel, str):
        modality = display_channel.lower().strip()
        if modality not in config.modalities:
            raise ValueError(
                f"display_channel '{display_channel}' invalid for stage {config.stage}. "
                f"Choose from: {list(config.modalities)}"
            )
        return config.modalities.index(modality), modality

    index = int(display_channel)
    if index < 0 or index >= len(config.modalities):
        raise ValueError(
            f"display_channel index {index} out of range for stage {config.stage} "
            f"({len(config.modalities)} channels)"
        )
    return index, config.modalities[index]


def prepare_stage_input(
    files: list[ScanFileIn],
    config: StageXaiConfig,
) -> np.ndarray:
    modality_map = map_files_to_modalities(files)
    tensor = build_multichannel_tensor(modality_map, list(config.modalities))

    expected_shape = (IMG_HEIGHT, IMG_WIDTH, config.input_channels)
    if tensor.shape != expected_shape:
        raise ValueError(
            f"Unsupported input shape {tensor.shape}; expected {expected_shape}"
        )

    return tensor


def predict_stage(
    model,
    input_tensor: np.ndarray,
    config: StageXaiConfig,
) -> tuple[int, str, dict[str, float], np.ndarray]:
    batch = np.expand_dims(input_tensor, axis=0).astype(np.float32)
    probabilities = model.predict(batch, verbose=0)[0]
    class_index = int(np.argmax(probabilities))
    label = config.class_labels[class_index]
    prob_dict = {
        label_name: round(float(prob) * 100, 2)
        for label_name, prob in zip(config.class_labels, probabilities, strict=True)
    }
    return class_index, label, prob_dict, probabilities
