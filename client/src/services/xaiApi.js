import { api } from "./api";

/** Default explanation (Grad-CAM++ on the backend). */
export const PRIMARY_XAI_METHOD = {
    id: "gradcam++",
    label: "Combined heatmap",
};

/** Alternate user-facing view (grid PCI on the backend). */
export const ALTERNATE_XAI_METHOD = {
    id: "pci",
    label: "Per-modality heatmaps",
};

/** Options shown in the scan UI — ids are sent to the API unchanged. */
export const XAI_VIEW_OPTIONS = [PRIMARY_XAI_METHOD, ALTERNATE_XAI_METHOD];

/** Gradient / activation methods (kept for internal / API compatibility). */
export const GRAD_XAI_METHODS = [
    PRIMARY_XAI_METHOD,
    { id: "gradcam", label: "Grad-CAM" },
    { id: "integrated_gradients", label: "Integrated Gradients" },
    { id: "vanilla_saliency", label: "Vanilla Saliency" },
];

/** Permutation methods (kept for internal / API compatibility). */
export const PERMUTATION_XAI_METHODS = [
    { id: "pci", label: "PCI grid (per-channel)" },
    { id: "pci_full_channel", label: "PCI full-channel (per-channel)" },
    { id: "occlusion", label: "Occlusion (per-channel)" },
    { id: "shap", label: "SHAP (per-channel)" },
];

export const XAI_METHODS = [...GRAD_XAI_METHODS, ...PERMUTATION_XAI_METHODS];
export const OTHER_XAI_METHODS = XAI_METHODS;

export const PERMUTATION_METHOD_IDS = new Set(
    PERMUTATION_XAI_METHODS.map((m) => m.id),
);

export function isPermutationMethod(methodId) {
    return PERMUTATION_METHOD_IDS.has(methodId);
}

export function viewOptionForMethod(methodId) {
    if (methodId === ALTERNATE_XAI_METHOD.id) {
        return ALTERNATE_XAI_METHOD.id;
    }
    if (isPermutationMethod(methodId)) {
        return ALTERNATE_XAI_METHOD.id;
    }
    return PRIMARY_XAI_METHOD.id;
}

/** User-facing labels for views stored on a scan. */
export function listStoredXaiViews(xai) {
    if (!xai) {
        return [];
    }

    const cachedIds = new Set();

    if (Array.isArray(xai.availableViews)) {
        xai.availableViews.forEach((id) => cachedIds.add(id));
    }

    if (xai.cache && typeof xai.cache === "object") {
        for (const [methodId, entry] of Object.entries(xai.cache)) {
            if (entry?.stages?.length) {
                cachedIds.add(methodId);
            }
        }
    }

    if (cachedIds.size === 0 && xai.stages?.length && xai.xaiMethod) {
        cachedIds.add(viewOptionForMethod(xai.xaiMethod));
    }

    return XAI_VIEW_OPTIONS.filter((option) => cachedIds.has(option.id));
}

export function hasCachedXaiView(xai, methodId) {
    if (!xai) {
        return false;
    }

    const entry = xai.cache?.[methodId];
    if (entry?.stages?.length) {
        return true;
    }

    return (
        xai.xaiMethod === methodId
        && Array.isArray(xai.stages)
        && xai.stages.length > 0
        && !xai.cache
    );
}

export async function runScanXaiApi(scanId, { xaiMethod }) {
    const res = await api.post(`/scan/${scanId}/xai`, { xaiMethod });
    return res.data;
}
