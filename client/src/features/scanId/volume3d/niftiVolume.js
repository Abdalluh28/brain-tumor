import * as nifti from "nifti-reader-js";

function typedArrayFromHeader(header, image) {
    switch (header.datatypeCode) {
        case 2:
            return new Uint8Array(image);
        case 4:
            return new Int16Array(image);
        case 8:
            return new Int32Array(image);
        case 16:
            return new Float32Array(image);
        case 64:
            return new Float64Array(image);
        case 512:
            return new Uint16Array(image);
        case 768:
            return new Uint32Array(image);
        default:
            return new Int16Array(image);
    }
}

export function parseNiftiBuffer(buffer) {
    let data = buffer;
    if (nifti.isCompressed(data)) {
        data = nifti.decompress(data);
    }
    if (!nifti.isNIFTI(data)) {
        throw new Error("File is not a valid NIfTI volume.");
    }

    const header = nifti.readHeader(data);
    const image = nifti.readImage(header, data);
    const typedData = typedArrayFromHeader(header, image);

    return {
        typedData,
        cols: header.dims[1],
        rows: header.dims[2],
        slices: header.dims[3],
    };
}

export async function fetchNiftiVolume(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load NIfTI (${response.status}).`);
    }

    const buffer = await response.arrayBuffer();
    return parseNiftiBuffer(buffer);
}

/** Match mri-viewer slice orientation (row flip). */
export function sampleVoxel(volume, x, y, z) {
    const { typedData, cols, rows, slices } = volume;
    const sx = Math.max(0, Math.min(cols - 1, x | 0));
    const sy = Math.max(0, Math.min(rows - 1, y | 0));
    const sz = Math.max(0, Math.min(slices - 1, z | 0));
    const niftiRow = rows - sy - 1;
    return typedData[sz * cols * rows + niftiRow * cols + sx];
}

export function computeIntensityRange(volume) {
    const { typedData } = volume;
    const stride = Math.max(1, Math.floor(typedData.length / 120_000));
    let min = typedData[0];
    let max = typedData[0];

    for (let i = 0; i < typedData.length; i += stride) {
        const value = typedData[i];
        if (value < min) min = value;
        if (value > max) max = value;
    }

    return { min, max: max === min ? min + 1 : max };
}

export function estimateBrainIsoLevel(volume) {
    const { typedData } = volume;
    const stride = Math.max(1, Math.floor(typedData.length / 80_000));
    const samples = [];

    for (let i = 0; i < typedData.length; i += stride) {
        samples.push(typedData[i]);
    }

    samples.sort((a, b) => a - b);
    const { min, max } = computeIntensityRange(volume);
    const percentile = samples[Math.floor(samples.length * 0.18)] ?? min;
    const normalized = (percentile - min) / (max - min || 1);

    return Math.max(0.1, Math.min(0.32, normalized));
}

export function volumeHasTumorMask(volume) {
    const { typedData } = volume;
    const stride = Math.max(1, Math.floor(typedData.length / 50_000));

    for (let i = 0; i < typedData.length; i += stride) {
        if (typedData[i] > 0) return true;
    }

    return false;
}

export function getPresentMaskLabels(volume) {
    const present = new Set();
    const { typedData } = volume;
    const stride = Math.max(1, Math.floor(typedData.length / 80_000));

    for (let i = 0; i < typedData.length; i += stride) {
        const label = typedData[i] | 0;
        if (label > 0) {
            present.add(label);
        }
    }

    return [...present].sort((a, b) => a - b);
}

export function maskHasLabel(volume, labelId) {
    const { typedData } = volume;
    const stride = Math.max(1, Math.floor(typedData.length / 80_000));

    for (let i = 0; i < typedData.length; i += stride) {
        if ((typedData[i] | 0) === labelId) return true;
    }

    return false;
}
