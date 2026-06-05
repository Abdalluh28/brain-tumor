/**
 * Shared helpers for scan PDF download and browser print.
 * Data collectors mirror ScanIdMRI / ScanIdXai image resolution logic.
 */

/** Legend text reused in PDF and print layouts (matches ScanIdFooter). */
export const CLASSIFICATION_REFERENCE = [
    { title: "Healthy", text: "No tumor detected in the brain tissue" },
    { title: "LGG", text: "Low-Grade Glioma - slower growing tumor" },
    { title: "HGG", text: "Glioblastoma - aggressive malignant tumor" },
    { title: "Metastasis", text: "Cancer spread from another body part" },
    { title: "Others", text: "Non-glioma tumor types such as meningioma" },
];

export function getPredictionText(prediction) {
    const key = prediction?.toLowerCase() || "healthy";
    return key === "healthy"
        ? "No Tumor Detected (Healthy)"
        : `${prediction} Tumor Detected`;
}

export const FULL_CASE_LABELS = {
    GLI: "Glioma (GLI)",
    METS: "Metastasis (METS)",
    OTHER: "Other tumor (OTHER)",
    Healthy: "Healthy (no tumor)",
};

const FULL_CASE_PREDICTION_KEYS = {
    gli: "hgg",
    mets: "metastasis",
    other: "others",
    healthy: "healthy",
};

/** 3D scan with full-case metadata (may have zero tumor slices). */
export function is3DFullCaseReport(scan) {
    return scan?.scanType === "3D" && !!scan?.fullCase?.casePrediction;
}

/** 3D scan whose report should use per-slice XAI + segmentation sections. */
export function is3DTumorSliceReport(scan) {
    return (
        is3DFullCaseReport(scan)
        && (scan.fullCase.tumorSlices?.length ?? 0) > 0
    );
}

export function getReportPrediction(scan) {
    if (is3DFullCaseReport(scan)) {
        const { fullCase } = scan;
        const caseLabel =
            FULL_CASE_LABELS[fullCase.casePrediction] ?? fullCase.casePrediction;

        return {
            text: `${caseLabel} — full case`,
            confidence: fullCase.averageConfidencePercent ?? scan.confidence,
            confidenceLabel: "Average confidence",
            isFullCase: true,
            fullCase,
            configKey:
                FULL_CASE_PREDICTION_KEYS[fullCase.casePrediction.toLowerCase()]
                ?? fullCase.casePrediction.toLowerCase(),
        };
    }

    return {
        text: getPredictionText(scan.prediction),
        confidence: scan.confidence,
        confidenceLabel: "Confidence",
        isFullCase: false,
        fullCase: null,
        configKey: scan.prediction?.toLowerCase() || "healthy",
    };
}

/** Per-slice MRI + XAI images for 3D full-case reports. */
export function collectFullCaseXaiImages(fullCase) {
    const tumorSlices = fullCase?.tumorSlices ?? [];
    const images = [];

    for (const slice of tumorSlices) {
        const z = slice.z ?? slice.sliceNumber;
        const prefix = `Slice z=${z}`;
        const original = slice.originalSlice || slice.xaiOriginal;

        if (original) {
            images.push({ src: original, label: `${prefix} — MRI reference` });
        }

        const heatmap =
            slice.xaiHeatmap && slice.xaiHeatmap !== slice.xai
                ? slice.xaiHeatmap
                : null;

        if (heatmap) {
            images.push({ src: heatmap, label: `${prefix} — Heatmap` });
        }

        if (slice.xai) {
            images.push({ src: slice.xai, label: `${prefix} — Overlay` });
        }
    }

    return images;
}

/** Per-slice segmentation overlays for 3D full-case reports. */
export function collectFullCaseSegmentationImages(fullCase) {
    const tumorSlices = fullCase?.tumorSlices ?? [];

    return tumorSlices
        .filter((slice) => slice.segmentation)
        .map((slice) => ({
            src: slice.segmentation,
            label: `Slice z=${slice.z ?? slice.sliceNumber} — Overlay on T1`,
        }));
}

const XAI_MODALITY_LABELS = {
    t1n: "T1n",
    t1c: "T1c",
    t2w: "T2w",
    t2f: "FLAIR",
};

/** Same normalization as ScanIdXai — supports legacy single-stage xai documents. */
function normalizeXaiStages(xai) {
    if (!xai) return [];
    if (Array.isArray(xai.stages) && xai.stages.length > 0) {
        return xai.stages;
    }
    if (xai.stage != null && (xai.overlayPath || xai.channelMaps)) {
        return [xai];
    }
    return [];
}

/** Collect every XAI image (all stages, modalities, heatmaps, overlays). */
export function collectXaiImages(xai) {
    const stages = normalizeXaiStages(xai);
    const images = [];

    for (const stage of stages) {
        const stageLabel =
            stage.targetClassLabel
            ?? (stage.stage != null ? `Stage ${stage.stage}` : "Explanation");
        const channelMaps = stage.channelMaps ?? [];

        if (channelMaps.length > 0) {
            for (const channel of channelMaps) {
                const modality =
                    XAI_MODALITY_LABELS[channel.modality] ?? channel.modality;
                const prefix = `XAI ${modality} (${stageLabel})`;

                if (channel.originalPath) {
                    images.push({ src: channel.originalPath, label: `${prefix} — MRI` });
                }
                if (channel.heatmapPath) {
                    images.push({ src: channel.heatmapPath, label: `${prefix} — Heatmap` });
                }
                if (channel.overlayPath) {
                    images.push({ src: channel.overlayPath, label: `${prefix} — Overlay` });
                }
            }
            continue;
        }

        const prefix = `XAI ${stageLabel}`;
        if (stage.originalPath) {
            images.push({ src: stage.originalPath, label: `${prefix} — MRI reference` });
        }
        if (stage.heatmapPath) {
            images.push({ src: stage.heatmapPath, label: `${prefix} — Heatmap` });
        }
        if (stage.overlayPath) {
            images.push({ src: stage.overlayPath, label: `${prefix} — Overlay` });
        }
    }

    return images;
}

/** Prefer uploaded PNG/JPG files; fall back to XAI original or Grad-CAM preview. */
export function collectMriImages(scan) {
    const { files, xai, gradCamPath } = scan;
    const imageFiles =
        files?.filter(
            (f) =>
                ["png", "jpg", "jpeg"].includes(f.format?.toLowerCase())
                && (f.url || f.rawPath),
        ) || [];

    if (imageFiles.length > 0) {
        return imageFiles.map((f) => ({
            src: f.url || f.rawPath,
            label: f.originalName || "MRI",
        }));
    }

    const fallback =
        xai?.stages?.[0]?.originalPath
        || xai?.originalPath
        || gradCamPath;

    return fallback ? [{ src: fallback, label: "MRI Preview" }] : [];
}

/** @react-pdf cannot embed remote URLs reliably — convert to base64 data URLs first. */
export async function urlToDataUrl(url) {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch image");
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/** Fetches and inlines all report images for PDF generation. Skips failed loads. */
export async function preloadReportImages(scan) {
    const use3DTumorLayout = is3DTumorSliceReport(scan);

    const mri = use3DTumorLayout ? [] : collectMriImages(scan);
    const xai = use3DTumorLayout ? [] : collectXaiImages(scan.xai);
    const fullCaseXai = use3DTumorLayout
        ? collectFullCaseXaiImages(scan.fullCase)
        : [];
    const fullCaseSegmentation = use3DTumorLayout
        ? collectFullCaseSegmentationImages(scan.fullCase)
        : [];

    const segMask = use3DTumorLayout ? null : scan.segmentation?.maskPath;
    const segOverlay = use3DTumorLayout ? null : scan.segmentation?.overlayPath;

    const entries = [
        ...mri.map((m, i) => ({ key: `mri-${i}`, url: m.src, label: m.label })),
        ...xai.map((x, i) => ({ key: `xai-${i}`, url: x.src, label: x.label })),
        ...fullCaseXai.map((x, i) => ({
            key: `fc-xai-${i}`,
            url: x.src,
            label: x.label,
        })),
        ...fullCaseSegmentation.map((s, i) => ({
            key: `fc-seg-${i}`,
            url: s.src,
            label: s.label,
        })),
        segMask && { key: "segMask", url: segMask, label: "Segmentation Mask" },
        segOverlay && { key: "segOverlay", url: segOverlay, label: "Segmentation Overlay" },
    ].filter(Boolean);

    const results = await Promise.all(
        entries.map(async (entry) => ({
            ...entry,
            dataUrl: await urlToDataUrl(entry.url),
        })),
    );

    return {
        mri: results
            .filter((r) => r.key.startsWith("mri-") && r.dataUrl)
            .map((r) => ({ src: r.dataUrl, label: r.label })),
        xai: results
            .filter((r) => r.key.startsWith("xai-") && r.dataUrl)
            .map((r) => ({ src: r.dataUrl, label: r.label })),
        fullCaseXai: results
            .filter((r) => r.key.startsWith("fc-xai-") && r.dataUrl)
            .map((r) => ({ src: r.dataUrl, label: r.label })),
        fullCaseSegmentation: results
            .filter((r) => r.key.startsWith("fc-seg-") && r.dataUrl)
            .map((r) => ({ src: r.dataUrl, label: r.label })),
        segMask: results.find((r) => r.key === "segMask")?.dataUrl ?? null,
        segOverlay: results.find((r) => r.key === "segOverlay")?.dataUrl ?? null,
        use3DTumorLayout,
    };
}

/** Ensures remote images are loaded before react-to-print opens the dialog. */
export function waitForImages(container) {
    const imgs = container?.querySelectorAll("img") ?? [];
    return Promise.all(
        [...imgs].map(
            (img) =>
                img.complete
                    ? Promise.resolve()
                    : new Promise((resolve) => {
                          img.onload = resolve;
                          img.onerror = resolve;
                      }),
        ),
    );
}
