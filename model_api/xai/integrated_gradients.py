from __future__ import annotations

from typing import Literal

import numpy as np
import tensorflow as tf

from .utils import reduce_attribution_to_2d


def compute_integrated_gradients(
    model,
    input_tensor,
    class_index: int,
    steps: int = 50,
    reduction: Literal["mean", "max"] = "mean",
) -> np.ndarray:
    """
    Integrated Gradients with zero baseline and linear interpolation.
    """
    if steps < 1:
        raise ValueError("ig_steps must be >= 1")

    batch_input = tf.cast(input_tensor, tf.float32)
    baseline = tf.zeros_like(batch_input)
    delta = batch_input - baseline

    alphas = tf.linspace(0.0, 1.0, steps + 1)[1:]
    accumulated_grads = tf.zeros_like(batch_input)

    for alpha in alphas:
        interpolated = baseline + alpha * delta
        with tf.GradientTape() as tape:
            tape.watch(interpolated)
            predictions = model(interpolated, training=False)
            if predictions.shape[-1] == 1:
                loss = predictions[:, 0]
            else:
                loss = predictions[:, class_index]

        grads = tape.gradient(loss, interpolated)
        if grads is None:
            raise RuntimeError("Integrated Gradients returned no gradients.")
        accumulated_grads += grads

    avg_grads = accumulated_grads / tf.cast(steps, tf.float32)
    attributions = delta * avg_grads
    heatmap = reduce_attribution_to_2d(attributions.numpy(), reduction=reduction)
    return heatmap
