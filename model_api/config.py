from pathlib import Path

MODEL_API_ROOT = Path(__file__).resolve().parent
MODELS_DIR = MODEL_API_ROOT / "Models"

IMG_HEIGHT = 240
IMG_WIDTH = 240

# Upload slot order from the Express backend (1-based in API payloads).
MODALITY_ORDER = ["t1n", "t1c", "t2w", "t2f"]
SLOT_TO_MODALITY = {index + 1: mod for index, mod in enumerate(MODALITY_ORDER)}

# Stage 1 uses the shared 2-channel setup from the training notebook.
STAGE1_MODALITIES = ["t1n", "t2w"]

STAGE1_MODEL_PATH = MODELS_DIR / "stage 1" / "custom_cnn_lowdrop_best (2).keras"
STAGE2_MODEL_PATH = MODELS_DIR / "stage 2" / "custom_cnn_3class_finetune_stage2_best.keras"
STAGE3_MODEL_PATH = MODELS_DIR / "stage 3" / "best_densenet_stage2_more_finetune_lessdrop.keras"

MODEL_VERSION = "cascade-v1.0.0"
