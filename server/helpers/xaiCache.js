/** @typedef {{ stages?: object[] }} XaiCacheEntry */

/**
 * @param {unknown} value
 */
function isNonEmptyPath(value) {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * True when a stage has at least one overlay URL to display.
 * @param {object | null | undefined} stage
 */
function stageHasRenderableOverlay(stage) {
    if (!stage || typeof stage !== "object") {
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

/**
 * @param {object | null | undefined} entry
 */
function cacheEntryHasImageLinks(entry) {
    if (!entry?.stages?.length) {
        return false;
    }

    return entry.stages.every(stageHasRenderableOverlay);
}

/**
 * @param {unknown} cache
 */
function plainCacheObject(cache) {
    if (!cache) {
        return {};
    }

    if (cache instanceof Map) {
        return Object.fromEntries(cache.entries());
    }

    if (typeof cache === "object") {
        return { ...cache };
    }

    return {};
}

/**
 * Ensure legacy single-method xai documents expose a cache map.
 * @param {object | null | undefined} xai
 */
function normalizeXaiDocument(xai) {
    if (!xai || typeof xai !== "object") {
        return null;
    }

    const normalized = { ...xai };
    const cache = plainCacheObject(normalized.cache);

    if (
        Array.isArray(normalized.stages) &&
        normalized.stages.length > 0 &&
        normalized.xaiMethod &&
        !cache[normalized.xaiMethod] &&
        cacheEntryHasImageLinks({ stages: normalized.stages })
    ) {
        cache[normalized.xaiMethod] = {
            stages: normalized.stages,
        };
    }

    normalized.cache = cache;
    normalized.availableViews = Object.keys(cache).filter((methodId) =>
        cacheEntryHasImageLinks(cache[methodId]),
    );
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
    if (cacheEntryHasImageLinks(entry)) {
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

    if (!cacheEntryHasImageLinks({ stages: xaiResult.stages })) {
        throw new Error(
            `XAI result for '${method}' has no overlay image URLs to cache.`,
        );
    }

    const cache = plainCacheObject(normalized.cache);
    cache[method] = { stages: xaiResult.stages };

    return {
        xaiMethod: method,
        cascadePrediction:
            xaiResult.cascadePrediction ?? normalized.cascadePrediction,
        stages: xaiResult.stages,
        cache,
        availableViews: Object.keys(cache).filter((id) =>
            cacheEntryHasImageLinks(cache[id]),
        ),
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

    for (const entry of Object.values(plainCacheObject(normalized.cache))) {
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
    stageHasRenderableOverlay,
    cacheEntryHasImageLinks,
};
