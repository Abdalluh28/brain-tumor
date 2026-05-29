from __future__ import annotations

import numpy as np
import tensorflow as tf

from .tf_device import configure_tensorflow


def keras_predict_proba(model, tensor: np.ndarray) -> np.ndarray:
    """
    Faster than model.predict() for batch size 1 (less wrapper overhead).
    """
    configure_tensorflow()
    batch = tensor.astype(np.float32)
    if batch.ndim == 3:
        batch = np.expand_dims(batch, axis=0)
    outputs = model(tf.constant(batch, dtype=tf.float32), training=False)
    return outputs.numpy()[0]
