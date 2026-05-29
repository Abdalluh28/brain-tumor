from __future__ import annotations

import logging
import os

import tensorflow as tf

from .config import TF_ENABLE_GPU, TF_GPU_MEMORY_GROWTH

logger = logging.getLogger(__name__)

_configured = False


def configure_tensorflow() -> dict[str, object]:
    """
    Enable GPU when available and configure memory growth.

    Call once at API startup (and before heavy XAI). Safe to call repeatedly.
    """
    global _configured

    if _configured:
        return get_tensorflow_device_info()

    if not TF_ENABLE_GPU:
        os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")

    gpus = tf.config.list_physical_devices("GPU")
    if TF_ENABLE_GPU and gpus:
        for gpu in gpus:
            try:
                tf.config.experimental.set_memory_growth(gpu, TF_GPU_MEMORY_GROWTH)
            except RuntimeError as exc:
                logger.warning("GPU memory growth not set: %s", exc)

    _configured = True
    info = get_tensorflow_device_info()
    logger.info(
        "TensorFlow devices: %s (GPU enabled=%s)",
        info.get("devices"),
        info.get("gpu_available"),
    )
    return info


def get_tensorflow_device_info() -> dict[str, object]:
    gpus = tf.config.list_physical_devices("GPU")
    return {
        "gpu_available": bool(gpus),
        "gpu_count": len(gpus),
        "gpu_names": [gpu.name for gpu in gpus],
        "devices": [
            {"name": d.name, "type": d.device_type}
            for d in tf.config.list_logical_devices()
        ],
        "tf_enable_gpu_config": TF_ENABLE_GPU,
    }
