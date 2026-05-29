# Brain Tumor Model API

FastAPI service used by the Express backend to run the 3-stage MRI cascade and save
the scan result in MongoDB.

## Pipeline

1. **Stage 1** (`custom_cnn_lowdrop_best (2).keras`): Healthy vs Tumor using T1 + T2 (`t1n`, `t2w`).
2. **Stage 2** (`efficientnet_3class_finetune_stage2.keras` or `model.keras`): EfficientNetB0, GLI vs METS vs OTHER, 4 modalities.
3. **Stage 3** (`best_densenet_stage2_more_finetune_lessdrop.keras`): HGG vs LGG for glioma cases.

Upload slot mapping (4 files from the backend):

| Slot | Modality | MRI sequence |
|------|----------|--------------|
| 1    | `t1n`    | T1           |
| 2    | `t1c`    | T1CE         |
| 3    | `t2w`    | T2           |
| 4    | `t2f`    | FLAIR        |

Supported file formats: `.png`, `.jpg`, `.jpeg`, `.nii`, `.nii.gz`, `.dcm`.

## Segmentation (after classification)

When the final prediction is **HGG**, **LGG**, or **Metastasis**, a segmentation model runs on all 4 modalities:

| Prediction | Model folder | Expected weight file (place one of these) |
|------------|--------------|-------------------------------------------|
| HGG / LGG  | `Models/segmentation/GLI Model/` | `unet_brats_best (3).keras` |
| Metastasis | `Models/segmentation/Mets Model/` | `residual_unet_brats_mets_best_v1_20.keras` |

Outputs are saved under `server/uploads/segmentation/<job-id>/`:

- `mask.png` — color-coded segmentation mask
- `overlay_t1n.png` — mask overlaid on T1
- `legend.png` — class color legend
- `distribution.png` — bar chart of pixel counts per class

Class labels: Background, NCR/NET, Edema, Enhancing Tumor.

## Analyze performance (upload path)

On `POST /scans/analyze` the service:

- Loads each MRI **once** (`prepare_scan_inputs`) and reuses tensors for classification, XAI, and segmentation.
- Runs **Grad-CAM++ on stage 2 only** (`ANALYZE_XAI_STAGES` in `config.py`). PCI and other per-channel methods are **not** run on upload.
- Runs segmentation in **parallel** with XAI when `ANALYZE_PARALLEL_SEGMENTATION_AND_XAI` is true.
- Uses **GPU** when `TF_ENABLE_GPU=true` and TensorFlow sees a GPU (largest win for classify + XAI + segmentation).

In the UI, open **Per-modality** to run PCI (cached after the first request). **Combined heatmap** uses the Grad-CAM++ result from analyze.

Restart the model API after changing `config.py` (parallel path, GPU, XAI stages).

## XAI (Explainable AI) — Stages 1, 2, and 3

Cascade classification uses stages 1–3; **default cascade XAI is stage 2 only** (EfficientNet). `POST /xai/explain` can still target stages 1–3 explicitly for debugging.

Returns base64 PNGs for:

- `images.original` — display channel (stage 1 default **T1n**, stages 2/3 default **T1c**)
- `images.heatmap` — colored attribution map
- `images.overlay` — heatmap blended on the display channel

**Methods:** `gradcam`, `gradcam++`, `integrated_gradients`, `vanilla_saliency`

**Supported stages:** `1`, `2`, `3`

Example body:

```json
{
  "files": [ /* 4 ScanFileIn objects with rawPath, format, slot 1-4 */ ],
  "stage": 2,
  "xaiMethod": "gradcam++",
  "displayChannel": "t1c",
  "targetClass": null,
  "igSteps": 50
}
```

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r model_api/requirements.txt
uvicorn model_api.main:app --reload --host 127.0.0.1 --port 8000
```

Run these commands from the repository root.

## Environment

The service reads `MONGO_URL` from `.env` or `server/.env`. Optional values:

- `MONGO_DB`: database name when the Mongo URL does not include one. Defaults to `test`.
- `MODEL_VERSION`: version string saved on each scan. Defaults to `cascade-v1.1.0-seg`.
- `TF_ENABLE_GPU`: set to `1` (default) to use a GPU when TensorFlow is built with CUDA. Check `GET /health` for `gpu_available`. Install `tensorflow` with GPU support on the host if `gpu_available` is false.

The Express server calls:

```text
MODEL_API_URL=http://127.0.0.1:8000/scans/analyze
```
