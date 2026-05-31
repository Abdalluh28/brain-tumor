import { useCallback, useMemo, useRef, useState } from "react";

const EMPTY_META = [null, null, null, null];

export function toSlotMeta(volumeData) {
  if (!volumeData) return null;
  return {
    fileName: volumeData.file.name,
    slices: volumeData.slices,
    cols: volumeData.cols,
    rows: volumeData.rows,
  };
}

export function useVolumeStore() {
  const dataRef = useRef([null, null, null, null]);
  const [slotMeta, setSlotMeta] = useState(EMPTY_META);
  const [volumeEpoch, setVolumeEpoch] = useState(0);

  const getVolumes = useCallback(() => dataRef.current, []);

  const isAnyVolumeLoaded = useMemo(
    () => slotMeta.some((meta) => meta !== null),
    [slotMeta],
  );

  const activeMeta = useMemo(
    () => slotMeta.find((meta) => meta !== null) ?? null,
    [slotMeta],
  );

  const maxSlices = activeMeta?.slices ?? 0;
  const currentDims = activeMeta
    ? `${activeMeta.cols} × ${activeMeta.rows}`
    : "N/A";

  const replaceAll = useCallback((data, meta) => {
    dataRef.current = data;
    setSlotMeta(meta);
  }, []);

  const setVolumeAt = useCallback((idx, volumeData) => {
    const nextData = [...dataRef.current];
    nextData[idx] = volumeData;
    dataRef.current = nextData;
    setSlotMeta((prev) => {
      const next = [...prev];
      next[idx] = toSlotMeta(volumeData);
      return next;
    });
  }, []);

  const clearSlot = useCallback((idx) => {
    const nextData = [...dataRef.current];
    nextData[idx] = null;
    dataRef.current = nextData;
    setSlotMeta((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    dataRef.current = [null, null, null, null];
    setSlotMeta(EMPTY_META);
  }, []);

  const scheduleRedraw = useCallback(() => {
    queueMicrotask(() => setVolumeEpoch((epoch) => epoch + 1));
  }, []);

  return {
    dataRef,
    slotMeta,
    volumeEpoch,
    getVolumes,
    isAnyVolumeLoaded,
    maxSlices,
    currentDims,
    replaceAll,
    setVolumeAt,
    clearSlot,
    clearAll,
    scheduleRedraw,
  };
}
