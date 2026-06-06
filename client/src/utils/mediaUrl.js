const UPLOADS_MARKER = "/uploads/";

/** Backend origin derived from the API base URL (strips trailing /api). */
export function getBackendOrigin() {
    const apiBase = import.meta.env.VITE_BACK_URL || "";
    if (!apiBase) return "";

    try {
        const parsed = new URL(apiBase);
        return parsed.origin;
    } catch {
        return apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
    }
}

function uploadsRelativePath(value) {
    const normalized = String(value).replace(/\\/g, "/");

    if (normalized.includes("/uploads/undefined")) {
        return null;
    }

    if (normalized.includes(UPLOADS_MARKER)) {
        const relative = normalized.split(UPLOADS_MARKER)[1]?.replace(/^\//, "");
        return relative || null;
    }

    return null;
}

/**
 * Turn a stored path or URL into a browser-loadable uploads URL.
 * Re-resolves against VITE_BACK_URL so localhost / 127.0.0.1 mismatches do not break <img>.
 */
export function resolveUploadUrl(pathOrUrl) {
    if (!pathOrUrl) return null;

    const relative = uploadsRelativePath(pathOrUrl);
    if (!relative) {
        if (/^https?:\/\//i.test(String(pathOrUrl))) {
            return String(pathOrUrl);
        }
        return null;
    }

    const origin = getBackendOrigin();
    if (origin) {
        return `${origin}${UPLOADS_MARKER}${relative}`;
    }

    return `${UPLOADS_MARKER}${relative}`;
}

/** Best-effort URL for a scan file record from the API. */
export function resolveScanFileUrl(file) {
    if (!file) return null;

    return (
        resolveUploadUrl(file.url)
        ?? resolveUploadUrl(file.storagePath)
        ?? resolveUploadUrl(file.rawPath)
    );
}
