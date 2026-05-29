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

/** Map UI tab id to backend XAI method id. */
export function methodIdForViewOption(viewId) {
    if (viewId === ALTERNATE_XAI_METHOD.id) {
        return ALTERNATE_XAI_METHOD.id;
    }
    return PRIMARY_XAI_METHOD.id;
}

function isNonEmptyPath(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function stageHasRenderableOverlay(stage) {
    if (!stage) {
        return false;
    }

    const channelMaps = stage.channelMaps;
    if (Array.isArray(channelMaps) && channelMaps.length > 0) {
        return channelMaps.some((channel) =>
            isNonEmptyPath(channel?.overlayPath),
        );
    }

    return isNonEmptyPath(stage.overlayPath);
}

function cacheEntryHasImageLinks(entry) {
    if (!entry?.stages?.length) {
        return false;
    }

    return entry.stages.every(stageHasRenderableOverlay);
}

function plainCacheObject(cache) {
    if (!cache || typeof cache !== "object") {
        return {};
    }

    return { ...cache };
}

/** Normalize xai document (cache map + legacy single-method shape). */
export function normalizeXaiDocument(xai) {
    if (!xai || typeof xai !== "object") {
        return null;
    }

    const normalized = { ...xai };
    const cache = plainCacheObject(normalized.cache);

    if (
        Array.isArray(normalized.stages)
        && normalized.stages.length > 0
        && normalized.xaiMethod
        && !cache[normalized.xaiMethod]
        && cacheEntryHasImageLinks({ stages: normalized.stages })
    ) {
        cache[normalized.xaiMethod] = { stages: normalized.stages };
    }

    normalized.cache = cache;
    normalized.availableViews = Object.keys(cache).filter((methodId) =>
        cacheEntryHasImageLinks(cache[methodId]),
    );

    return normalized;
}

export function getCachedXaiEntry(xai, methodId) {
    const normalized = normalizeXaiDocument(xai);
    if (!normalized) {
        return null;
    }

    const entry = normalized.cache?.[methodId];
    return cacheEntryHasImageLinks(entry) ? entry : null;
}

/** Switch active stages to a cached method (no API call). */
export function applyActiveXaiView(xai, methodId) {
    const normalized = normalizeXaiDocument(xai);
    const entry = getCachedXaiEntry(normalized, methodId);
    if (!entry || !normalized) {
        return null;
    }

    return {
        ...normalized,
        xaiMethod: methodId,
        stages: entry.stages,
        availableViews: Object.keys(normalized.cache).filter((id) =>
            cacheEntryHasImageLinks(normalized.cache[id]),
        ),
    };
}

/** User-facing labels for views stored on a scan. */
export function listStoredXaiViews(xai) {
    if (!xai) {
        return [];
    }

    const normalized = normalizeXaiDocument(xai);
    const cachedIds = new Set(normalized?.availableViews ?? []);

    for (const option of XAI_VIEW_OPTIONS) {
        if (hasCachedXaiView(normalized, methodIdForViewOption(option.id))) {
            cachedIds.add(option.id);
        }
    }

    return XAI_VIEW_OPTIONS.filter((option) => cachedIds.has(option.id));
}

export function hasCachedXaiView(xai, methodOrViewId) {
    if (!xai) {
        return false;
    }

    const methodId =
        methodOrViewId === PRIMARY_XAI_METHOD.id
        || methodOrViewId === ALTERNATE_XAI_METHOD.id
            ? methodIdForViewOption(methodOrViewId)
            : methodOrViewId;

    return getCachedXaiEntry(xai, methodId) != null;
}

export async function runScanXaiApi(scanId, { xaiMethod }) {
    const res = await api.post(`/scan/${scanId}/xai`, { xaiMethod });
    return res.data;
}
