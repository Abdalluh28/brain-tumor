from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import get_database
from .model_runner import run_model
from .schemas import AnalyzeScanRequest

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


@app.get("/health")
async def health():
    return {"status": "ok"}


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
                "rawPath": scan_file.rawPath,
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
