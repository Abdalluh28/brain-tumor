import { api } from "./api";

/** Default method run automatically after classification. */
export const PRIMARY_XAI_METHOD = {
    id: "gradcam++",
    label: "Grad-CAM++",
};

/** Gradient / activation methods (single combined heatmap per stage). */
export const GRAD_XAI_METHODS = [
    PRIMARY_XAI_METHOD,
    { id: "gradcam", label: "Grad-CAM" },
    { id: "integrated_gradients", label: "Integrated Gradients" },
    { id: "vanilla_saliency", label: "Vanilla Saliency" },
];

/** Permutation / occlusion / SHAP — one heatmap per input channel. */
export const PERMUTATION_XAI_METHODS = [
    { id: "pci", label: "PCI (per-channel permutation)" },
    { id: "occlusion", label: "Occlusion (per-channel)" },
    { id: "shap", label: "SHAP (per-channel)" },
];

export const XAI_METHODS = [...GRAD_XAI_METHODS, ...PERMUTATION_XAI_METHODS];

export const OTHER_XAI_METHODS = XAI_METHODS.filter(
    (m) => m.id !== PRIMARY_XAI_METHOD.id,
);

export const PERMUTATION_METHOD_IDS = new Set(
    PERMUTATION_XAI_METHODS.map((m) => m.id),
);

export function isPermutationMethod(methodId) {
    return PERMUTATION_METHOD_IDS.has(methodId);
}

export async function runScanXaiApi(scanId, { xaiMethod }) {
    const res = await api.post(`/scan/${scanId}/xai`, { xaiMethod });
    return res.data;
}
