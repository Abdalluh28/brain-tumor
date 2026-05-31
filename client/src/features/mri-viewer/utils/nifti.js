import * as nifti from "nifti-reader-js";

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

export function parseNiftiFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let buffer = e.target.result;
        if (nifti.isCompressed(buffer)) {
          buffer = nifti.decompress(buffer);
        }
        if (!nifti.isNIFTI(buffer)) {
          reject(
            new Error(`File "${file.name}" is not a valid NIfTI volume.`),
          );
          return;
        }

        const header = nifti.readHeader(buffer);
        const image = nifti.readImage(header, buffer);
        const typedData = typedArrayFromHeader(header, image);

        let min = typedData[0];
        let max = typedData[0];
        for (let i = 0; i < typedData.length; i++) {
          if (typedData[i] < min) min = typedData[i];
          if (typedData[i] > max) max = typedData[i];
        }

        resolve({
          file,
          header,
          typedData,
          min,
          max,
          slices: header.dims[3],
          cols: header.dims[1],
          rows: header.dims[2],
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
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

  canvas.width = cols;
  canvas.height = rows;

  const ctx = canvas.getContext("2d");
  const canvasImageData = ctx.createImageData(cols, rows);
  const sliceSize = cols * rows;
  const sliceOffset = safeSlice * sliceSize;
  const range = globalMax - globalMin || 1;

  for (let r = 0; r < rows; r++) {
    const niftiRow = rows - r - 1;
    const niftiRowOffset = sliceOffset + niftiRow * cols;
    const canvasRowOffset = r * cols;

    for (let c = 0; c < cols; c++) {
      const val = typedData[niftiRowOffset + c];
      const normVal = Math.round(((val - globalMin) / range) * 255);
      const clampedVal = Math.max(0, Math.min(255, normVal));
      const canvasIdx = (canvasRowOffset + c) * 4;

      canvasImageData.data[canvasIdx] = clampedVal;
      canvasImageData.data[canvasIdx + 1] = clampedVal;
      canvasImageData.data[canvasIdx + 2] = clampedVal;
      canvasImageData.data[canvasIdx + 3] = 255;
    }
  }

  ctx.putImageData(canvasImageData, 0, 0);
}
