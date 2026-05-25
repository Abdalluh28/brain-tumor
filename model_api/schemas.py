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
    storagePath: str | None = Field(
        default=None,
        description="Local disk path for model/XAI re-runs when rawPath is a public URL.",
    )


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


XaiMethod = Literal["gradcam", "gradcam++", "integrated_gradients", "vanilla_saliency"]
AttributionReduction = Literal["mean", "max"]


class XaiExplainRequest(BaseModel):
    """Explain a cascade stage classifier with XAI (stages 1, 2, and 3)."""

    files: list[ScanFileIn] = Field(min_length=4, max_length=4)
    stage: int = Field(default=2, ge=1, le=3)
    xaiMethod: XaiMethod = "gradcam++"
    targetClass: int | None = Field(
        default=None,
        description="Class index to explain. Defaults to predicted class.",
    )
    targetLayer: str | None = Field(
        default=None,
        description="Conv2D layer name for Grad-CAM methods. Auto-detected if omitted.",
    )
    displayChannel: int | str | None = Field(
        default=None,
        description="Modality name (e.g. t1c) or channel index for overlay background.",
    )
    igSteps: int = Field(default=50, ge=1, le=200)
    attributionReduction: AttributionReduction = "mean"


class XaiImageOut(BaseModel):
    original: str = Field(description="Base64 PNG of display channel grayscale.")
    heatmap: str = Field(description="Base64 PNG colored heatmap.")
    overlay: str = Field(description="Base64 PNG overlay on display channel.")


class XaiMetadataOut(BaseModel):
    stage: int
    stageLabels: list[str]
    inputShape: list[int]
    displayModality: str
    displayChannelIndex: int
    targetLayer: str | None = None
    attributionReduction: AttributionReduction
    igSteps: int | None = None
    processingTimeMs: float
    rawProbabilities: dict[str, float]


class XaiExplainResponse(BaseModel):
    stage: int
    xaiMethod: XaiMethod
    predictedLabel: str
    predictedIndex: int
    targetClassIndex: int
    targetClassLabel: str
    probabilities: dict[str, float]
    displayChannel: int
    displayModality: str
    images: XaiImageOut
    metadata: XaiMetadataOut


class XaiResultOut(BaseModel):
    """XAI artifacts stored on disk and served via /uploads URLs."""

    stage: int
    xaiMethod: XaiMethod
    cascadePrediction: Prediction
    targetClassIndex: int
    targetClassLabel: str
    displayChannel: int
    displayModality: str
    originalPath: str
    heatmapPath: str
    overlayPath: str
    metadata: dict


class ScanXaiMethodRequest(BaseModel):
    xaiMethod: XaiMethod = "gradcam++"
    targetClass: int | None = None
    targetLayer: str | None = None
    displayChannel: int | str | None = None
    igSteps: int = Field(default=50, ge=1, le=200)
    attributionReduction: AttributionReduction = "mean"


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
    xai: XaiResultOut | None = None
    xaiError: str | None = Field(
        default=None,
        description="Set when cascade XAI could not be generated during analyze.",
    )
