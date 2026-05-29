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
STAGE3_MODEL_PATH = MODELS_DIR / "stage 3" / "best_densenet_stage2_more_finetune_lessdrop.keras"

# Stage 2: EfficientNetB0 4-channel (see Models/stage 2/stage2-efficientnet.ipynb)
STAGE2_MODEL_CANDIDATES = (
    MODELS_DIR / "stage 2" / "model.keras",
    MODELS_DIR / "stage 2" / "efficientnet_3class_finetune_stage2.keras",
    MODELS_DIR / "stage 2" / "efficientnet_3class_stage0_best.keras",
    # Legacy custom CNN (fallback)
    MODELS_DIR / "stage 2" / "custom_cnn_3class_finetune_stage2_best.keras",
)

# ---------------------------------------------------------------------------
# Stage-2 EfficientNet Grad-CAM / Grad-CAM++ target layer (debugging)
# Change ONLY the string below, restart model API, re-run XAI on a scan.
# Set to None to auto-pick the last Conv2D in the model (usually top_conv).
# ---------------------------------------------------------------------------
STAGE2_GRADCAM_TARGET_LAYER: str | None = "block7a_project_conv"
# Other Conv2D layers to try (last blocks of EfficientNetB0):
#   "block6a_project_conv"
#   "block6b_project_conv"
#   "block6c_project_conv"
#   "block6d_project_conv"
#   "block7a_project_conv"   <-- current
#   "top_conv"

# ---------------------------------------------------------------------------
# Permutation XAI (PCI, occlusion, SHAP) — edit here, restart model API.
# ---------------------------------------------------------------------------
PERMUTATION_OCCLUSION_PATCH_SIZE = 32
PERMUTATION_OCCLUSION_STRIDE = 8
PERMUTATION_PCI_GRID_ROWS = 8
PERMUTATION_PCI_GRID_COLS = 8
PERMUTATION_PCI_PERMUTATIONS_PER_CELL = 2
PERMUTATION_SHAP_BACKGROUND_SAMPLES = 8
# Channel ranking: shuffle repeats + zero-out / mean-fill occlusion
PERMUTATION_CHANNEL_IMPORTANCE_SAMPLES = 8

MODEL_VERSION = "cascade-v1.2.0-efficientnet-s2-xai"

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


def resolve_model_path(candidates: tuple[Path, ...], *, label: str = "model") -> Path:
    for path in candidates:
        if path.exists():
            return path
    searched = "\n  - ".join(str(path) for path in candidates)
    raise FileNotFoundError(
        f"No {label} found. Place a .keras file in the model folder:\n  - {searched}"
    )


def resolve_stage2_model_path() -> Path:
    return resolve_model_path(STAGE2_MODEL_CANDIDATES, label="stage 2 model")


# Resolved at import for pipeline path checks; actual load uses stage2_loader.
STAGE2_MODEL_PATH = resolve_stage2_model_path()
