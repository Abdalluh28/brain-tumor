from typing import Literal

from pydantic import BaseModel, Field


ScanFormat = Literal["nii", "nii.gz", "dcm", "png", "jpg", "jpeg"]
Prediction = Literal["HGG", "LGG", "Metastasis", "Healthy", "Others"]


class ScanFileIn(BaseModel):
    rawPath: str
    format: ScanFormat
    originalName: str | None = None
    slot: int | None = None


class AnalyzeScanRequest(BaseModel):
    userId: str
    files: list[ScanFileIn] = Field(min_length=4, max_length=4)
    radiologist: str | None = None
    backendPublicUrl: str | None = None


class ModelResult(BaseModel):
    prediction: Prediction
    confidenceScores: dict[Prediction, float] = Field(
        description="Joint cascade probabilities mapped to final class labels.",
    )
    confidence: float
    gradCamPath: str
    processedTime: float
    modelVersion: str
