from __future__ import annotations

import tensorflow as tf


def compute_gradcam_pp(
    model,
    input_tensor,
    class_index: int,
    layer_name: str,
) -> tf.Tensor:
    """
    Grad-CAM++ (Chattopadhyay et al.) implementation.
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

    conv_outputs = conv_outputs[0]
    grads = grads[0]

    grads_squared = grads ** 2
    grads_cubed = grads ** 3

    global_sum = tf.reduce_sum(grads_squared, axis=(0, 1), keepdims=True)
    alpha_denom = 2.0 * grads_squared + global_sum * conv_outputs
    alpha_denom = tf.where(alpha_denom != 0.0, alpha_denom, tf.ones_like(alpha_denom))
    alphas = grads_squared / alpha_denom

    weights = tf.reduce_sum(alphas * tf.maximum(grads, 0.0), axis=(0, 1))
    heatmap = tf.reduce_sum(tf.maximum(conv_outputs * weights, 0.0), axis=-1)
    heatmap = tf.maximum(heatmap, 0)

    heatmap = tf.image.resize(
        heatmap[..., tf.newaxis],
        (input_tensor.shape[1], input_tensor.shape[2]),
        method="bilinear",
    )[..., 0]

    return heatmap.numpy()
