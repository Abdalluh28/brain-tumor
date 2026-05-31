from __future__ import annotations

import numpy as np
import tensorflow as tf

from .tf_device import configure_tensorflow


def keras_predict_proba(model, tensor: np.ndarray) -> np.ndarray:
    """
    Faster than model.predict() for batch size 1 (less wrapper overhead).
    Mean-aggregates when the batch has multiple rows (legacy 2D multi-slice path).
    """
    batch_probs = keras_predict_batch_proba(model, tensor)
    if batch_probs.shape[0] == 1:
        return batch_probs[0]
    return batch_probs.mean(axis=0)


def keras_predict_batch_proba(model, tensor: np.ndarray) -> np.ndarray:
    """Return per-row class probabilities, shape (N, num_classes)."""
    configure_tensorflow()
    batch = tensor.astype(np.float32)
    if batch.ndim == 3:
        batch = np.expand_dims(batch, axis=0)
    outputs = model(tf.constant(batch, dtype=tf.float32), training=False)
    probabilities = outputs.numpy()
    if probabilities.ndim == 1:
        return probabilities[np.newaxis, :]
    return probabilities
