from __future__ import annotations

from typing import Literal

import tensorflow as tf

from .utils import reduce_attribution_to_2d


def compute_vanilla_saliency(
    model,
    input_tensor,
    class_index: int,
    reduction: Literal["mean", "max"] = "mean",
) -> tf.Tensor:
    """Vanilla saliency: gradient of class score w.r.t. input."""
    batch_input = tf.cast(input_tensor, tf.float32)

    with tf.GradientTape() as tape:
        tape.watch(batch_input)
        predictions = model(batch_input, training=False)
        if predictions.shape[-1] == 1:
            loss = predictions[:, 0]
        else:
            loss = predictions[:, class_index]

    grads = tape.gradient(loss, batch_input)
    if grads is None:
        raise RuntimeError("Vanilla saliency returned no gradients.")

    return reduce_attribution_to_2d(grads.numpy(), reduction=reduction)
