from __future__ import annotations

from functools import lru_cache

from .pipeline import _load_models as _load_pipeline_models
from .segmentation import _load_segmentation_model
from .tf_device import configure_tensorflow
from .xai.registry import load_stage_model


def warmup_models() -> None:
    """Load classification, XAI, and segmentation weights once at API startup."""
    configure_tensorflow()
    _load_pipeline_models()
    for stage in (1, 2, 3):
        load_stage_model(stage)
    for model_type in ("GLI", "METS"):
        _load_segmentation_model(model_type)


@lru_cache(maxsize=1)
def get_stage_model(stage: int):
    model, config = load_stage_model(stage)
    return model, config
