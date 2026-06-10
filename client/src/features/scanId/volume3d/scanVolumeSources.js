import { resolveScanFileUrl, resolveUploadUrl } from "@/utils/mediaUrl";

/** T1ce slot in the 4-modality upload grid (1-based slot index). */
const T1C_SLOT = 2;
const NIFTI_FORMATS = new Set(["nii", "nii.gz"]);

export function getVolume3dSources(files, maskNiftiPath) {
    const t1cFile =
        files?.find((file) => file.slot === T1C_SLOT) ?? files?.[1] ?? null;

    const mriUrl = resolveScanFileUrl(t1cFile);
    const maskUrl = resolveUploadUrl(maskNiftiPath);
    const mriIsNifti = NIFTI_FORMATS.has(t1cFile?.format);

    return {
        mriUrl,
        maskUrl,
        canVisualize: Boolean(mriUrl && maskUrl && mriIsNifti),
    };
}
