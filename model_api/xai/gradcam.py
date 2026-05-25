from __future__ import annotations

import keras
import tensorflow as tf

from .utils import build_conv_feature_model


def compute_gradcam(
    model,
    input_tensor,
    class_index: int,
    conv_layer: keras.layers.Layer,
) -> tf.Tensor:
    """
    Standard Grad-CAM for the given class and convolutional layer.
    Returns a 2D heatmap tensor (H, W) before final normalization.
    """
    conv_model = build_conv_feature_model(model, conv_layer)

    with tf.GradientTape() as tape:
        conv_outputs = conv_model(input_tensor, training=False)
        predictions = model(input_tensor, training=False)
        if predictions.shape[-1] == 1:
            loss = predictions[:, 0]
        else:
            loss = predictions[:, class_index]

    grads = tape.gradient(loss, conv_outputs)
    if grads is None:
        raise RuntimeError(f"No gradients for layer '{conv_layer.name}'.")

    pooled_grads = tf.reduce_mean(grads, axis=(0, 1))
    conv_outputs = conv_outputs[0]
    heatmap = tf.reduce_sum(conv_outputs * pooled_grads, axis=-1)
    heatmap = tf.maximum(heatmap, 0)

    heatmap = tf.image.resize(
        heatmap[..., tf.newaxis],
        (input_tensor.shape[1], input_tensor.shape[2]),
        method="bilinear",
    )[..., 0]

    return heatmap.numpy()
