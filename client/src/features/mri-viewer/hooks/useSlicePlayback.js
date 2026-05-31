import { useEffect, useRef, useState } from "react";
import { drawSlice } from "../utils/nifti";

export function useSlicePlayback({
  volumes,
  sliceIndex,
  setSliceIndex,
  maxSlices,
  isPatientInfoValid,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRefs = useRef([null, null, null, null]);
  const playTimerRef = useRef(null);

  useEffect(() => {
    if (!isPatientInfoValid) return;

    volumes.forEach((vol, idx) => {
      if (!vol) return;
      const canvas = canvasRefs.current[idx];
      if (canvas) {
        drawSlice(
          canvas,
          vol.header,
          vol.typedData,
          sliceIndex,
          vol.min,
          vol.max,
        );
      }
    });
  }, [sliceIndex, volumes, isPatientInfoValid]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (maxSlices === 0 || !isPatientInfoValid) return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        setSliceIndex(Math.min(maxSlices - 1, sliceIndex + 1));
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSliceIndex(Math.max(0, sliceIndex - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [maxSlices, sliceIndex, isPatientInfoValid, setSliceIndex]);

  useEffect(() => {
    if (isPlaying && maxSlices > 0 && isPatientInfoValid) {
      playTimerRef.current = setInterval(() => {
        const next = sliceIndex + 1;
        setSliceIndex(next >= maxSlices ? 0 : next);
      }, 80);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, maxSlices, sliceIndex, isPatientInfoValid, setSliceIndex]);

  const handleWheel = (e) => {
    if (maxSlices === 0 || !isPatientInfoValid) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const next = sliceIndex + delta;
    setSliceIndex(Math.max(0, Math.min(maxSlices - 1, next)));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isPatientInfoValid) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const stopPlaying = () => setIsPlaying(false);

  return {
    canvasRefs,
    isPlaying,
    setIsPlaying,
    isDragging,
    handleWheel,
    handleDragOver,
    handleDragLeave,
    stopPlaying,
  };
}
