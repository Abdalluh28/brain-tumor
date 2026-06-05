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
    const mri = collectMriImages(scan);
    const xai = collectXaiImages(scan.xai);
    const segMask = scan.segmentation?.maskPath;
    const segOverlay = scan.segmentation?.overlayPath;

    const entries = [
        ...mri.map((m, i) => ({ key: `mri-${i}`, url: m.src, label: m.label })),
        ...xai.map((x, i) => ({ key: `xai-${i}`, url: x.src, label: x.label })),
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
        segMask: results.find((r) => r.key === "segMask")?.dataUrl ?? null,
        segOverlay: results.find((r) => r.key === "segOverlay")?.dataUrl ?? null,
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
