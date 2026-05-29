/** @typedef {{ stages?: object[] }} XaiCacheEntry */

/**
 * Ensure legacy single-method xai documents expose a cache map.
 * @param {object | null | undefined} xai
 */
function normalizeXaiDocument(xai) {
    if (!xai || typeof xai !== "object") {
        return null;
    }

    const normalized = { ...xai };

    if (!normalized.cache || typeof normalized.cache !== "object") {
        normalized.cache = {};
    } else {
        normalized.cache = { ...normalized.cache };
    }

    if (
        Array.isArray(normalized.stages) &&
        normalized.stages.length > 0 &&
        normalized.xaiMethod &&
        !normalized.cache[normalized.xaiMethod]
    ) {
        normalized.cache[normalized.xaiMethod] = {
            stages: normalized.stages,
        };
    }

    normalized.availableViews = Object.keys(normalized.cache);
    return normalized;
}

/**
 * @param {object | null | undefined} xai
 * @param {string} methodId
 */
function getCachedXaiEntry(xai, methodId) {
    const normalized = normalizeXaiDocument(xai);
    if (!normalized) {
        return null;
    }

    const entry = normalized.cache?.[methodId];
    if (entry?.stages?.length) {
        return entry;
    }

    return null;
}

/**
 * @param {object | null | undefined} xai
 * @param {string} methodId
 */
function hasCachedXaiView(xai, methodId) {
    return getCachedXaiEntry(xai, methodId) != null;
}

/**
 * Switch active xai fields to a cached method without recomputing.
 * @param {object | null | undefined} xai
 * @param {string} methodId
 */
function applyActiveXaiView(xai, methodId) {
    const normalized = normalizeXaiDocument(xai);
    const entry = getCachedXaiEntry(normalized, methodId);
    if (!entry) {
        return null;
    }

    return {
        ...normalized,
        xaiMethod: methodId,
        stages: entry.stages,
        availableViews: Object.keys(normalized.cache),
    };
}

/**
 * Store a freshly computed method result and mark it active.
 * @param {object | null | undefined} existingXai
 * @param {object} xaiResult
 */
function mergeXaiResult(existingXai, xaiResult) {
    const normalized = normalizeXaiDocument(existingXai) || {
        cache: {},
    };
    const method = xaiResult.xaiMethod;

    const cache = { ...normalized.cache };
    cache[method] = { stages: xaiResult.stages };

    return {
        xaiMethod: method,
        cascadePrediction:
            xaiResult.cascadePrediction ?? normalized.cascadePrediction,
        stages: xaiResult.stages,
        cache,
        availableViews: Object.keys(cache),
    };
}

/**
 * @param {object | null | undefined} xai
 */
function pickXaiPreviewPath(xai) {
    const stages = xai?.stages ?? [];
    const lastStage = stages[stages.length - 1];
    if (!lastStage) {
        return null;
    }

    const channelMaps = lastStage.channelMaps ?? [];
    const lastChannel = channelMaps[channelMaps.length - 1];
    return lastChannel?.overlayPath ?? lastStage.overlayPath ?? null;
}

/**
 * Collect all stored XAI asset URLs for cleanup.
 * @param {object | null | undefined} xai
 */
function collectXaiAssetPaths(xai) {
    const normalized = normalizeXaiDocument(xai);
    if (!normalized) {
        return [];
    }

    const seen = new Set();
    const paths = [];

    const addStagePaths = (stages) => {
        for (const stage of stages ?? []) {
            for (const path of [
                stage.originalPath,
                stage.heatmapPath,
                stage.overlayPath,
            ]) {
                if (path && !seen.has(path)) {
                    seen.add(path);
                    paths.push(path);
                }
            }

            for (const channel of stage.channelMaps ?? []) {
                for (const path of [
                    channel.originalPath,
                    channel.heatmapPath,
                    channel.overlayPath,
                ]) {
                    if (path && !seen.has(path)) {
                        seen.add(path);
                        paths.push(path);
                    }
                }
            }
        }
    };

    for (const entry of Object.values(normalized.cache ?? {})) {
        addStagePaths(entry.stages);
    }

    addStagePaths(normalized.stages);

    return paths;
}

module.exports = {
    normalizeXaiDocument,
    getCachedXaiEntry,
    hasCachedXaiView,
    applyActiveXaiView,
    mergeXaiResult,
    pickXaiPreviewPath,
    collectXaiAssetPaths,
};
