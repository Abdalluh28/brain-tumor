"""Load stage-2 EfficientNet (4-channel MRI) with training-time custom objects."""

from __future__ import annotations

import keras
from tensorflow.keras.applications.efficientnet import preprocess_input

from .config import resolve_stage2_model_path


def load_stage2_model():
    """
    EfficientNetB0 4ch→3class model from the stage2-efficientnet notebook.

    The saved graph includes Lambda(preprocess_input) layers that require
    custom_objects when loading outside the notebook.
    """
    path = resolve_stage2_model_path()
    keras.config.enable_unsafe_deserialization()
    return keras.models.load_model(
        path,
        compile=False,
        custom_objects={"preprocess_input": preprocess_input},
    )
