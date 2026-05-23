from typing import Literal

from pydantic import BaseModel, Field


IMAGE_FORMATS = ("png", "jpg", "jpeg")
VOLUME_FORMATS = ("nii", "nii.gz", "dcm")

ScanFormat = Literal["nii", "nii.gz", "dcm", "png", "jpg", "jpeg"]
Prediction = Literal["HGG", "LGG", "Metastasis", "Healthy", "Others"]
Gender = Literal['male', 'female']
ScanType = Literal["MRI", "3D"]


class ScanFileIn(BaseModel):
    rawPath: str
    format: ScanFormat
    originalName: str | None = None
    slot: int | None = None


class AnalyzeScanRequest(BaseModel):
    userId: str
    # Patient Information
    patientName: str = Field(
        min_length=2,
        max_length=100,
    )

    patientId: str = Field(
        min_length=1,
        max_length=50,
    )

    patientAge: int = Field(
        gt=0,
        lt=120,
    )

    patientGender: Gender

    patientPhone: str = Field(
        min_length=6,
        max_length=20,
    )

    notes: str | None = Field(
        default=None,
        max_length=1000,
    )

    scanType: ScanType
    files: list[ScanFileIn] = Field(min_length=4, max_length=4)
    radiologist: str | None = None
    backendPublicUrl: str | None = None


class SegmentationClassStatOut(BaseModel):
    classId: int
    label: str
    colorHex: str
    pixelCount: int
    percentage: float


class SegmentationResult(BaseModel):
    modelType: Literal["GLI", "METS"]
    maskPath: str
    overlayPath: str
    legendPath: str
    distributionPath: str
    classStats: list[SegmentationClassStatOut]
    metadata: dict


class ModelResult(BaseModel):
    prediction: Prediction
    confidenceScores: dict[Prediction, float] = Field(
        description="Joint cascade probabilities mapped to final class labels.",
    )
    confidence: float
    gradCamPath: str
    processedTime: float
    modelVersion: str
    segmentation: SegmentationResult | None = None
