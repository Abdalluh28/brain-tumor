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
    # Existing patient id, or the stored patient identifier when full patient
    # information is provided for a new patient.
    patientId: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    # New patient information. Required only when patientId does not resolve to
    # an existing patient.
    patientName: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    patientAge: int | None = Field(
        default=None,
        gt=0,
        lt=120,
    )

    patientGender: Gender | None = None

    patientPhone: str | None = Field(
        default=None,
        min_length=6,
        max_length=20,
    )

    patientEmail: str | None = Field(
        default=None,
        max_length=255,
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


XaiMethod = Literal[
    "gradcam",
    "gradcam++",
    "integrated_gradients",
    "vanilla_saliency",
    "pci",
    "pci_full_channel",
    "occlusion",
    "shap",
]
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


class XaiChannelMapOut(BaseModel):
    """Per-modality heatmap for permutation / occlusion / SHAP methods."""

    modality: str
    channelIndex: int
    channelImportance: float
    originalPath: str
    heatmapPath: str
    overlayPath: str


class XaiStageResultOut(BaseModel):
    """Per-stage XAI artifacts along the cascade path."""

    stage: int
    targetClassIndex: int
    targetClassLabel: str
    displayChannel: int
    displayModality: str
    originalPath: str = ""
    heatmapPath: str = ""
    overlayPath: str = ""
    channelMaps: list[XaiChannelMapOut] | None = None
    metadata: dict


class CascadeXaiResultOut(BaseModel):
    """Multi-stage cascade XAI (1–3 heatmaps depending on prediction path)."""

    xaiMethod: XaiMethod
    cascadePrediction: Prediction
    stages: list[XaiStageResultOut]


# Backward-compatible alias for single-stage rerun responses
XaiResultOut = CascadeXaiResultOut


class ScanXaiMethodRequest(BaseModel):
    xaiMethod: XaiMethod = "gradcam++"
    targetClass: int | None = None
    targetLayer: str | None = None
    displayChannel: int | str | None = None
    igSteps: int = Field(default=50, ge=1, le=200)
    attributionReduction: AttributionReduction = "mean"


CasePredictionLabel = Literal["GLI", "METS", "OTHER", "Healthy"]


class TumorSliceOut(BaseModel):
    z: int
    sliceNumber: int
    confidence: float | None = None
    originalSlice: str
    segmentation: str = ""
    xai: str = Field(
        default="",
        description="XAI overlay image URL for this slice.",
    )
    xaiOriginal: str = ""
    xaiHeatmap: str = ""


class FullCaseSliceResultOut(BaseModel):
    """Unified per-slice row for 3D UI: modalities, prediction, T1c overlays."""

    z: int
    sliceNumber: int
    prediction: Prediction
    confidence: float | None = None
    modalities: dict[str, str] = Field(default_factory=dict)
    t1cReference: str = ""
    xaiOverlay: str = Field(
        default="",
        description="Grad-CAM++ overlay on T1c for this slice.",
    )
    segmentationOverlay: str = Field(
        default="",
        description="Segmentation mask overlay on T1c for this slice.",
    )


class ValidSlicePreviewOut(BaseModel):
    z: int
    sliceNumber: int
    modalities: dict[str, str]


class FullCaseResult(BaseModel):
    casePrediction: CasePredictionLabel
    averageConfidence: float = Field(
        description="Mean slice confidence on a 0–1 scale.",
    )
    averageConfidencePercent: float = Field(
        description="Mean slice confidence on a 0–100 scale.",
    )
    numValidSlices: int
    numTumorSlices: int
    validSlicePreviews: list[ValidSlicePreviewOut] = Field(
        default_factory=list,
        description="All brain-valid slices exported before per-slice inference.",
    )
    sliceResults: list[FullCaseSliceResultOut] = Field(
        default_factory=list,
        description="Unified per-slice view: modalities, prediction, T1c XAI/seg overlays.",
    )
    tumorSlices: list[TumorSliceOut]
    maskMetadata: dict | None = None


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
    xai: CascadeXaiResultOut | None = None
    xaiError: str | None = Field(
        default=None,
        description="Set when cascade XAI could not be generated during analyze.",
    )
    sliceFiltering: dict | None = Field(
        default=None,
        description="T1c brain-size slice filter metadata used before classification.",
    )
    fullCase: FullCaseResult | None = Field(
        default=None,
        description="3D full-case pipeline: majority vote, tumor slices, volume seg.",
    )
