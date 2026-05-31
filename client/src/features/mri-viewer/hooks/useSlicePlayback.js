import { useCallback, useEffect, useRef, useState } from "react";
import { drawSlice } from "../utils/nifti";

export function useSlicePlayback({
  dataRef,
  slotMeta,
  volumeEpoch,
  sliceIndex,
  setSliceIndex,
  maxSlices,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRefs = useRef([null, null, null, null]);
  const playTimerRef = useRef(null);
  const drawFrameRef = useRef(null);
  const sliceRef = useRef(sliceIndex);
  sliceRef.current = sliceIndex;

  const drawSlot = useCallback((idx, slice) => {
    const vol = dataRef.current[idx];
    if (!vol) return;
    const canvas = canvasRefs.current[idx];
    if (!canvas) return;
    drawSlice(
      canvas,
      vol.header,
      vol.typedData,
      slice,
      vol.min,
      vol.max,
    );
  }, [dataRef]);

  const drawLoadedSlots = useCallback(
    (slice, onlyIndices = null) => {
      const indices =
        onlyIndices ??
        slotMeta.map((meta, idx) => (meta ? idx : -1)).filter((idx) => idx >= 0);

      for (const idx of indices) {
        drawSlot(idx, slice);
      }
    },
    [slotMeta, drawSlot],
  );

  const scheduleDraw = useCallback(
    (slice, onlyIndices = null) => {
      if (drawFrameRef.current) {
        cancelAnimationFrame(drawFrameRef.current);
      }
      drawFrameRef.current = requestAnimationFrame(() => {
        drawFrameRef.current = null;
        drawLoadedSlots(slice, onlyIndices);
      });
    },
    [drawLoadedSlots],
  );

  useEffect(() => {
    if (!slotMeta.some(Boolean)) return;
    scheduleDraw(sliceIndex);
    return () => {
      if (drawFrameRef.current) {
        cancelAnimationFrame(drawFrameRef.current);
        drawFrameRef.current = null;
      }
    };
  }, [sliceIndex, volumeEpoch, slotMeta, scheduleDraw]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (maxSlices === 0) return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        setSliceIndex((current) => Math.min(maxSlices - 1, current + 1));
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSliceIndex((current) => Math.max(0, current - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [maxSlices, setSliceIndex]);

  useEffect(() => {
    if (isPlaying && maxSlices > 0) {
      playTimerRef.current = setInterval(() => {
        setSliceIndex((current) => {
          const next = current + 1;
          return next >= maxSlices ? 0 : next;
        });
      }, 80);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, maxSlices, setSliceIndex]);

  const handleWheel = (e) => {
    if (maxSlices === 0) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setSliceIndex((current) =>
      Math.max(0, Math.min(maxSlices - 1, current + delta)),
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const stopPlaying = () => setIsPlaying(false);

  const cancelPendingDraw = useCallback(() => {
    if (drawFrameRef.current) {
      cancelAnimationFrame(drawFrameRef.current);
      drawFrameRef.current = null;
    }
  }, []);

  return {
    canvasRefs,
    isPlaying,
    setIsPlaying,
    isDragging,
    handleWheel,
    handleDragOver,
    handleDragLeave,
    stopPlaying,
    cancelPendingDraw,
  };
}
