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

self.onmessage = (event) => {
  const { jobId, buffer, fileName } = event.data;

  try {
    let data = buffer;
    if (nifti.isCompressed(data)) {
      data = nifti.decompress(data);
    }
    if (!nifti.isNIFTI(data)) {
      self.postMessage({
        jobId,
        ok: false,
        error: `File "${fileName}" is not a valid NIfTI volume.`,
      });
      return;
    }

    const header = nifti.readHeader(data);
    const image = nifti.readImage(header, data);
    const typedData = typedArrayFromHeader(header, image);
    const { min, max } = computeMinMax(typedData);

    self.postMessage(
      {
        jobId,
        ok: true,
        min,
        max,
        cols: header.dims[1],
        rows: header.dims[2],
        slices: header.dims[3],
        arrayBuffer: typedData.buffer,
        arrayType: typedData.constructor.name,
      },
      [typedData.buffer],
    );
  } catch (err) {
    self.postMessage({
      jobId,
      ok: false,
      error: err?.message || "Failed to parse NIfTI file",
    });
  }
};
