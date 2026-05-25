import { api } from "./api";

/** Default method run automatically after classification. */
export const PRIMARY_XAI_METHOD = {
    id: "gradcam++",
    label: "Grad-CAM++",
};

/** All XAI methods selectable from the scan report dialog. */
export const XAI_METHODS = [
    PRIMARY_XAI_METHOD,
    { id: "gradcam", label: "Grad-CAM" },
    { id: "integrated_gradients", label: "Integrated Gradients" },
    { id: "vanilla_saliency", label: "Vanilla Saliency" },
];

export const OTHER_XAI_METHODS = XAI_METHODS;

export async function runScanXaiApi(scanId, { xaiMethod }) {
    const res = await api.post(`/scan/${scanId}/xai`, { xaiMethod });
    return res.data;
}
