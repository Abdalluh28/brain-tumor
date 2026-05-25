import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import get_database
from .model_runner import run_model
from .schemas import (
    AnalyzeScanRequest,
    ScanXaiMethodRequest,
    XaiExplainRequest,
    XaiExplainResponse,
    CascadeXaiResultOut,
)
from .xai.exceptions import (
    ExplanationGenerationError,
    InvalidTargetLayerError,
    InvalidXaiMethodError,
    UnsupportedStageError,
)
from .xai_service import rerun_scan_xai_from_document, run_stage_xai

app = FastAPI(title="Brain Tumor Model API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize_scan(scan: dict) -> dict:
    serialized = {**scan}

    serialized["_id"] = str(serialized["_id"])
    serialized["userId"] = str(serialized["userId"])

    for key in ("createdAt", "updatedAt"):
        if isinstance(serialized.get(key), datetime):
            serialized[key] = (
                serialized[key]
                .isoformat()
                .replace("+00:00", "Z")
            )

    return serialized


def _get_file_url(raw_path: str, backend_public_url: str | None) -> str | None:
    if not backend_public_url:
        return None
    normalized = raw_path.replace("\\", "/")
    marker = "/uploads/"
    if marker in normalized:
        upload_path = normalized.split(marker, 1)[1]
        return f"{backend_public_url.rstrip('/')}/uploads/{quote(upload_path)}"
    return None

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/xai/methods")
async def list_xai_methods():
    return {
        "methods": [
            {"id": "gradcam", "label": "Grad-CAM"},
            {"id": "gradcam++", "label": "Grad-CAM++"},
            {"id": "integrated_gradients", "label": "Integrated Gradients"},
            {"id": "vanilla_saliency", "label": "Vanilla Saliency"},
        ],
        "supportedStages": [1, 2, 3],
        "cascadeDefaultMethod": "gradcam++",
    }


@app.post("/xai/explain", response_model=XaiExplainResponse)
async def explain_with_xai(payload: XaiExplainRequest):
    """
    Run an isolated stage classifier and generate an XAI explanation.

    Supported cascade stages: 1 (Healthy/Tumor), 2 (GLI/METS/OTHER),
    3 (HGG/LGG). Methods: gradcam, gradcam++, integrated_gradients,
    vanilla_saliency.
    """
    for scan_file in payload.files:
        if not Path(scan_file.rawPath).exists():
            raise HTTPException(
                status_code=400,
                detail=f"Input file not found: {scan_file.rawPath}",
            )

    try:
        return run_stage_xai(
            payload.files,
            stage=payload.stage,
            xai_method=payload.xaiMethod,
            target_class=payload.targetClass,
            target_layer=payload.targetLayer,
            display_channel=payload.displayChannel,
            ig_steps=payload.igSteps,
            attribution_reduction=payload.attributionReduction,
        )
    except UnsupportedStageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InvalidXaiMethodError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InvalidTargetLayerError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ExplanationGenerationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"XAI explanation failed: {exc}",
        ) from exc


@app.post("/scans/{scan_id}/xai", response_model=CascadeXaiResultOut)
async def rerun_scan_xai(scan_id: str, payload: ScanXaiMethodRequest):
    """
    Re-run XAI for an existing scan (alternate methods only — no segmentation).
    Requires files[].storagePath on the saved scan document.
    """
    try:
        object_id = ObjectId(scan_id)
    except InvalidId as exc:
        raise HTTPException(status_code=400, detail="Invalid scan id") from exc

    database = get_database()
    scan = await database.scans.find_one({"_id": object_id})

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    backend_public_url = os.getenv(
        "BACKEND_PUBLIC_URL",
        "http://127.0.0.1:3000",
    )

    try:
        xai_result = rerun_scan_xai_from_document(
            {**scan, "_id": str(scan["_id"])},
            xai_method=payload.xaiMethod,
            backend_public_url=backend_public_url,
            target_class=payload.targetClass,
            target_layer=payload.targetLayer,
            display_channel=payload.displayChannel,
            ig_steps=payload.igSteps,
            attribution_reduction=payload.attributionReduction,
        )
    except UnsupportedStageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ExplanationGenerationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"XAI explanation failed: {exc}",
        ) from exc

    await database.scans.update_one(
        {"_id": object_id},
        {
            "$set": {
                "xai": xai_result.model_dump(),
                "gradCamPath": xai_result.stages[-1].overlayPath,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )

    return xai_result


@app.post("/scans/analyze")
async def analyze_scan(payload: AnalyzeScanRequest):

    # ------------------
    # Validate User ID
    # ------------------
    try:
        user_id = ObjectId(payload.userId)

    except InvalidId as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid userId",
        ) from exc

    # ------------------
    # Run Model
    # ------------------
    try:
        result = run_model(
            payload.files,
            payload.backendPublicUrl,
            payload.scanType,
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Model inference failed: {exc}",
        ) from exc

    now = datetime.now(timezone.utc)

    # ------------------
    # Create Scan Document
    # ------------------
    scan = {
        # User
        "userId": user_id,

        # Patient Information
        "patientName": payload.patientName,
        "patientId": payload.patientId,
        "patientAge": payload.patientAge,
        "patientGender": payload.patientGender,
        "patientPhone": payload.patientPhone,
        "notes": payload.notes,
        "scanType": payload.scanType,

        # Files
        "files": [
            {
                "rawPath": _get_file_url(scan_file.rawPath, payload.backendPublicUrl)
                or scan_file.rawPath,
                "storagePath": scan_file.rawPath,
                "format": scan_file.format,
                "originalName": scan_file.originalName,
                "slot": scan_file.slot,
            }
            for scan_file in payload.files
        ],

        # AI Results
        "prediction": result.prediction,
        "confidenceScores": result.confidenceScores,
        "confidence": result.confidence,
        "gradCamPath": result.gradCamPath,
        "xai": result.xai.model_dump() if result.xai is not None else None,
        "xaiError": result.xaiError,
        "segmentation": (
            result.segmentation.model_dump()
            if result.segmentation is not None
            else None
        ),

        # Metadata
        "status": "completed",
        "radiologist": payload.radiologist or "AI Model",
        "processedTime": result.processedTime,
        "modelVersion": result.modelVersion,

        # Dates
        "createdAt": now,
        "updatedAt": now,
    }

    # ------------------
    # Save To MongoDB
    # ------------------
    database = get_database()

    insert_result = await database.scans.insert_one(scan)

    saved_scan = await database.scans.find_one(
        {"_id": insert_result.inserted_id}
    )

    return {
        "message": "Scan analyzed successfully",
        "scan": _serialize_scan(saved_scan),
    }
