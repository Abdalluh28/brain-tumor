from __future__ import annotations

import tensorflow as tf


def compute_gradcam(
    model,
    input_tensor,
    class_index: int,
    layer_name: str,
) -> tf.Tensor:
    """
    Standard Grad-CAM for the given class and convolutional layer.
    Returns a 2D heatmap tensor (H, W) before final normalization.
    """
    grad_model = tf.keras.models.Model(
        inputs=model.input,
        outputs=[
            model.get_layer(layer_name).output,
            model.output,
        ],
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(input_tensor, training=False)
        if predictions.shape[-1] == 1:
            loss = predictions[:, 0]
        else:
            loss = predictions[:, class_index]

    grads = tape.gradient(loss, conv_outputs)
    if grads is None:
        raise RuntimeError(f"No gradients for layer '{layer_name}'.")

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
