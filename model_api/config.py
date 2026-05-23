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

MODEL_VERSION = "cascade-v1.1.0-seg"

SEGMENTATION_DIR = MODELS_DIR / "segmentation"
GLI_SEG_MODEL_DIR = SEGMENTATION_DIR / "GLI Model"
METS_SEG_MODEL_DIR = SEGMENTATION_DIR / "Mets Model"

# Place trained weights in these folders (see README). First existing match is used.
GLI_SEG_MODEL_CANDIDATES = (
    GLI_SEG_MODEL_DIR / "unet_brats_best (3).keras",
    GLI_SEG_MODEL_DIR / "unet_brats_best.keras",
    GLI_SEG_MODEL_DIR / "unet_brats_best_v3_working.keras",
)
METS_SEG_MODEL_CANDIDATES = (
    METS_SEG_MODEL_DIR / "residual_unet_brats_mets_best_v1_20.keras",
    METS_SEG_MODEL_DIR / "unet_brats_mets_best.keras",
)

NUM_SEG_CLASSES = 4

# BraTS-style label map (shared by GLI and METS segmentation models).
SEG_CLASS_NAMES = {
    0: "Background",
    1: "NCR/NET",
    2: "Edema",
    3: "Enhancing Tumor",
}
SEG_CLASS_COLORS = {
    0: (0, 0, 0),
    1: (220, 38, 38),
    2: (34, 197, 94),
    3: (250, 204, 21),
}
SEG_CLASS_HEX = {
    0: "#000000",
    1: "#dc2626",
    2: "#22c55e",
    3: "#facc15",
}


def resolve_model_path(candidates: tuple[Path, ...]) -> Path:
    for path in candidates:
        if path.exists():
            return path
    searched = "\n  - ".join(str(path) for path in candidates)
    raise FileNotFoundError(
        f"No segmentation model found. Place a .keras file in the model folder:\n  - {searched}"
    )
