import * as nifti from "nifti-reader-js";
import {
  buildVolumeFromParseResult,
  parseBufferInPool,
} from "./niftiParsePool";

/** Max pixels drawn per slice — keeps canvas work fast on large volumes. */
const MAX_DRAW_PIXELS = 196_608; // ~ 448×448

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

function parseBufferOnMainThread(file, buffer) {
  let data = buffer;
  if (nifti.isCompressed(data)) {
    data = nifti.decompress(data);
  }
  if (!nifti.isNIFTI(data)) {
    throw new Error(`File "${file.name}" is not a valid NIfTI volume.`);
  }

  const header = nifti.readHeader(data);
  const image = nifti.readImage(header, data);
  const typedData = typedArrayFromHeader(header, image);
  const { min, max } = computeMinMax(typedData);

  return {
    file,
    header,
    typedData,
    min,
    max,
    slices: header.dims[3],
    cols: header.dims[1],
    rows: header.dims[2],
  };
}

export function yieldToUi() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

export function detectModalitySlotIndex(fileName) {
  const name = fileName.toLowerCase();

  if (
    name.includes("t1ce") ||
    name.includes("t1c") ||
    name.includes("t1_ce") ||
    name.includes("t1-ce")
  ) {
    return 1;
  }
  if (name.includes("t1")) return 0;
  if (name.includes("t2")) return 2;
  if (name.includes("flair") || name.includes("flr")) return 3;

  return -1;
}

export function isNiftiFileName(fileName) {
  const name = fileName.toLowerCase();
  return name.endsWith(".nii") || name.endsWith(".nii.gz");
}

export async function parseNiftiFile(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const bufferCopy = buffer.slice(0);

  try {
    const result = await parseBufferInPool(bufferCopy, file.name);
    return buildVolumeFromParseResult(file, result);
  } catch {
    return parseBufferOnMainThread(file, buffer);
  }
}

export async function parseNiftiFilesParallel(files) {
  const valid = files.filter((file) => isNiftiFileName(file.name));
  const buffers = await Promise.all(
    valid.map(async (file) => ({
      file,
      buffer: (await readFileAsArrayBuffer(file)).slice(0),
    })),
  );

  const parsed = await Promise.all(
    buffers.map(async ({ file, buffer }) => {
      try {
        const result = await parseBufferInPool(buffer, file.name);
        return { file, volumeData: buildVolumeFromParseResult(file, result) };
      } catch {
        const fallbackBuffer = (await readFileAsArrayBuffer(file)).slice(0);
        return {
          file,
          volumeData: parseBufferOnMainThread(file, fallbackBuffer),
        };
      }
    }),
  );

  return parsed;
}

function computeMinMax(typedData) {
  const len = typedData.length;
  if (len === 0) return { min: 0, max: 1 };

  const stride = Math.max(1, Math.floor(len / 250_000));
  let min = typedData[0];
  let max = typedData[0];

  for (let i = 0; i < len; i += stride) {
    const v = typedData[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  return { min, max };
}

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

function getDrawDimensions(cols, rows) {
  const pixelCount = cols * rows;
  if (pixelCount <= MAX_DRAW_PIXELS) {
    return { drawCols: cols, drawRows: rows };
  }

  const scale = Math.sqrt(MAX_DRAW_PIXELS / pixelCount);
  return {
    drawCols: Math.max(1, Math.round(cols * scale)),
    drawRows: Math.max(1, Math.round(rows * scale)),
  };
}

export function drawSlice(
  canvas,
  header,
  typedData,
  sliceIdx,
  globalMin,
  globalMax,
) {
  if (!canvas || !header || !typedData) return;

  const cols = header.dims[1];
  const rows = header.dims[2];
  const totalSlices = header.dims[3];
  const safeSlice = Math.max(0, Math.min(totalSlices - 1, sliceIdx));
  const { drawCols, drawRows } = getDrawDimensions(cols, rows);

  if (canvas.width !== drawCols || canvas.height !== drawRows) {
    canvas.width = drawCols;
    canvas.height = drawRows;
  }

  const ctx = canvas.getContext("2d", { alpha: false });
  const canvasImageData = ctx.createImageData(drawCols, drawRows);
  const pixels = canvasImageData.data;
  const sliceSize = cols * rows;
  const sliceOffset = safeSlice * sliceSize;
  const range = globalMax - globalMin || 1;
  const scale = 255 / range;

  for (let dr = 0; dr < drawRows; dr++) {
    const r = Math.min(rows - 1, Math.floor((dr * rows) / drawRows));
    const niftiRow = rows - r - 1;
    const niftiRowOffset = sliceOffset + niftiRow * cols;
    let canvasIdx = dr * drawCols * 4;

    for (let dc = 0; dc < drawCols; dc++) {
      const c = Math.min(cols - 1, Math.floor((dc * cols) / drawCols));
      const val = typedData[niftiRowOffset + c];
      let norm = (val - globalMin) * scale;
      if (norm < 0) norm = 0;
      else if (norm > 255) norm = 255;
      const v = norm | 0;

      pixels[canvasIdx] = v;
      pixels[canvasIdx + 1] = v;
      pixels[canvasIdx + 2] = v;
      pixels[canvasIdx + 3] = 255;
      canvasIdx += 4;
    }
  }

  ctx.putImageData(canvasImageData, 0, 0);
}
