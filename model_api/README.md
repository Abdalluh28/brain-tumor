# Brain Tumor Model API

FastAPI service used by the Express backend to run the 3-stage MRI cascade and save
the scan result in MongoDB.

## Pipeline

1. **Stage 1** (`custom_cnn_lowdrop_best (2).keras`): Healthy vs Tumor using T1 + T2 (`t1n`, `t2w`).
2. **Stage 2** (`custom_cnn_3class_finetune_stage2_best.keras`): GLI vs METS vs OTHER using all 4 modalities.
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

The Express server calls:

```text
MODEL_API_URL=http://127.0.0.1:8000/scans/analyze
```
