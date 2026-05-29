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
from .config import (
    ANALYZE_DEFAULT_XAI_METHOD,
    ANALYZE_PRELOAD_MODELS_AT_STARTUP,
    ANALYZE_XAI_STAGES,
)
from .model_registry import warmup_models
from .tf_device import configure_tensorflow, get_tensorflow_device_info

configure_tensorflow()
if ANALYZE_PRELOAD_MODELS_AT_STARTUP:
    warmup_models()
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
from .xai_cache import (
    apply_active_xai_view,
    cascade_result_from_stored,
    merge_xai_result,
)
from .xai_service import (
    cascade_stage_preview_overlay,
    rerun_scan_xai_from_document,
    run_stage_xai,
)

app = FastAPI(title="Brain Tumor Model API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _cascade_preview_overlay(xai_result: CascadeXaiResultOut) -> str | None:
    if not xai_result.stages:
        return None
    return cascade_stage_preview_overlay(xai_result.stages[-1])


def _serialize_scan(scan: dict) -> dict:
    serialized = {**scan}

    serialized["_id"] = str(serialized["_id"])
    serialized["userId"] = str(serialized["userId"])
    if serialized.get("patient") is not None:
        serialized["patient"] = str(serialized["patient"])

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


async def _resolve_patient_id(
    payload: AnalyzeScanRequest,
    user_id: ObjectId,
) -> ObjectId:
    database = get_database()
    patients = database.patients
    patient_id = payload.patientId.strip() if payload.patientId else None
    if patient_id in {"undefined", "null", ""}:
        patient_id = None

    if patient_id:
        patient_filter = (
            {
                "userId": user_id,
                "$or": [
                    {"_id": ObjectId(patient_id)},
                    {"patientId": patient_id},
                ],
            }
            if ObjectId.is_valid(patient_id)
            else {"userId": user_id, "patientId": patient_id}
        )
        patient = await patients.find_one(patient_filter)
        if patient:
            return patient["_id"]

        if not all(
            [
                payload.patientName,
                payload.patientAge,
                payload.patientGender,
                payload.patientPhone,
            ]
        ):
            raise HTTPException(status_code=404, detail="Patient not found")

    if not all(
        [
            payload.patientName,
            payload.patientAge,
            payload.patientGender,
            payload.patientPhone,
        ]
    ):
        raise HTTPException(
            status_code=400,
            detail="Patient information is required when patientId is not provided",
        )

    now = datetime.now(timezone.utc)
    patient = {
        "userId": user_id,
        "name": payload.patientName,
        "age": payload.patientAge,
        "gender": payload.patientGender,
        "phone": payload.patientPhone,
        "email": payload.patientEmail,
        "notes": payload.notes or "",
        "createdAt": now,
        "updatedAt": now,
    }
    if patient_id:
        patient["patientId"] = patient_id

    insert_result = await patients.insert_one(patient)
    return insert_result.inserted_id


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "tensorflow": get_tensorflow_device_info(),
    }


@app.get("/xai/methods")
async def list_xai_methods():
    return {
        "methods": [
            {"id": "gradcam", "label": "Grad-CAM"},
            {"id": "gradcam++", "label": "Grad-CAM++"},
            {"id": "integrated_gradients", "label": "Integrated Gradients"},
            {"id": "vanilla_saliency", "label": "Vanilla Saliency"},
            {"id": "pci", "label": "PCI grid (per-channel)"},
            {"id": "pci_full_channel", "label": "PCI full-channel (per-channel)"},
            {"id": "occlusion", "label": "Occlusion (per-channel)"},
            {"id": "shap", "label": "SHAP (per-channel)"},
        ],
        "perChannelMethods": ["pci", "pci_full_channel", "occlusion", "shap"],
        "supportedStages": [1, 2, 3],
        "cascadeDefaultMethod": "gradcam++",
        "analyzeDefaultXaiMethod": ANALYZE_DEFAULT_XAI_METHOD,
        "analyzeXaiStages": list(ANALYZE_XAI_STAGES),
        "perChannelOnDemandOnly": True,
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

    existing_xai = scan.get("xai")
    cached_view = apply_active_xai_view(existing_xai, payload.xaiMethod)
    if cached_view is not None:
        preview = _cascade_preview_overlay(
            CascadeXaiResultOut(
                xaiMethod=cached_view["xaiMethod"],
                cascadePrediction=cached_view["cascadePrediction"],
                stages=cached_view["stages"],
            )
        )
        await database.scans.update_one(
            {"_id": object_id},
            {
                "$set": {
                    "xai": cached_view,
                    "gradCamPath": preview,
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )
        return cascade_result_from_stored(cached_view)

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

    merged_xai = merge_xai_result(existing_xai, xai_result)
    preview = _cascade_preview_overlay(xai_result)

    await database.scans.update_one(
        {"_id": object_id},
        {
            "$set": {
                "xai": merged_xai,
                "gradCamPath": preview,
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
    patient_id = await _resolve_patient_id(payload, user_id)

    # ------------------
    # Create Scan Document
    # ------------------
    scan = {
        # User
        "userId": user_id,

        # Patient
        "patient": patient_id,
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
        "xai": (
            merge_xai_result(None, result.xai)
            if result.xai is not None
            else None
        ),
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
