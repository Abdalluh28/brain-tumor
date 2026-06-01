const ARRAY_CTORS = {
  Uint8Array,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
  Uint16Array,
  Uint32Array,
};

const POOL_SIZE = Math.min(4, navigator.hardwareConcurrency || 4);
const workers = [];
const idleWorkers = [];
const jobQueue = [];
let jobId = 0;
const pendingJobs = new Map();

function ensurePool() {
  if (workers.length > 0) return;

  for (let i = 0; i < POOL_SIZE; i++) {
    const worker = new Worker(
      new URL("./niftiWorker.js", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (event) => {
      const { jobId: id, ok, error, ...result } = event.data;
      const pending = pendingJobs.get(id);
      if (!pending) return;

      pendingJobs.delete(id);
      idleWorkers.push(worker);

      if (ok) pending.resolve(result);
      else pending.reject(new Error(error || "Failed to parse NIfTI file"));

      drainQueue();
    };

    worker.onerror = () => {
      pendingJobs.forEach(({ reject }) =>
        reject(new Error("NIfTI worker failed")),
      );
      pendingJobs.clear();
      jobQueue.length = 0;
    };

    workers.push(worker);
    idleWorkers.push(worker);
  }
}

function drainQueue() {
  while (jobQueue.length > 0 && idleWorkers.length > 0) {
    const job = jobQueue.shift();
    const worker = idleWorkers.pop();
    worker.postMessage(
      { jobId: job.id, buffer: job.buffer, fileName: job.fileName },
      [job.buffer],
    );
  }
}

export function parseBufferInPool(buffer, fileName) {
  ensurePool();

  return new Promise((resolve, reject) => {
    const id = ++jobId;
    pendingJobs.set(id, { resolve, reject });
    jobQueue.push({ id, buffer, fileName });
    drainQueue();
  });
}

export function buildVolumeFromParseResult(file, result) {
  const Ctor = ARRAY_CTORS[result.arrayType] || Int16Array;
  const typedData = new Ctor(result.arrayBuffer);
  const header = {
    dims: [0, result.cols, result.rows, result.slices],
  };

  return {
    file,
    header,
    typedData,
    min: result.min,
    max: result.max,
    slices: result.slices,
    cols: result.cols,
    rows: result.rows,
  };
}
