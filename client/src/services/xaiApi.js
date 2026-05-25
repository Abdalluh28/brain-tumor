import { api } from "./api";

export const XAI_METHODS = [
    { id: "gradcam", label: "Grad-CAM" },
    { id: "gradcam++", label: "Grad-CAM++" },
    { id: "integrated_gradients", label: "Integrated Gradients" },
    { id: "vanilla_saliency", label: "Vanilla Saliency" },
];

export async function runScanXaiApi(scanId, { xaiMethod }) {
    const res = await api.post(`/scan/${scanId}/xai`, { xaiMethod });
    return res.data;
}
