import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { clearViewerCase } from "@/features/scan/scanSlice";
import ViewerWorkstation from "./components/ViewerWorkstation";
import { useVolumeStore } from "./hooks/useVolumeStore";
import { useMriVolumes } from "./hooks/useMriVolumes";
import { useSlicePlayback } from "./hooks/useSlicePlayback";
import { useScanActions } from "./hooks/useScanActions";

export default function MriViewerWorkspace({ getValues }) {
  const dispatch = useDispatch();
  const cancelDrawRef = useRef(() => {});
  const store = useVolumeStore();

  useEffect(() => {
    dispatch(clearViewerCase());
  }, [dispatch]);

  const {
    sliceIndex,
    setSliceIndex,
    isLoading,
    loadingMessage,
    loadingProgress,
    handleFilesInput,
    handleSlotUpload,
    handleRemoveVolume,
    clearCase,
  } = useMriVolumes(store, {
    onBeforeVolumeUpdate: () => cancelDrawRef.current(),
  });

  const playback = useSlicePlayback({
    dataRef: store.dataRef,
    slotMeta: store.slotMeta,
    volumeEpoch: store.volumeEpoch,
    sliceIndex,
    setSliceIndex,
    maxSlices: store.maxSlices,
  });

  useEffect(() => {
    cancelDrawRef.current = playback.cancelPendingDraw;
  }, [playback.cancelPendingDraw]);

  const { handleScanSlice, handleScanVolume } = useScanActions({
    getVolumes: store.getVolumes,
    sliceIndex,
    canvasRefs: playback.canvasRefs,
    getValues,
  });

  const handleDrop = (e) => {
    e.preventDefault();
    playback.handleDragLeave();
    if (e.dataTransfer.files?.length > 0) {
      handleFilesInput(e.dataTransfer.files);
    }
  };

  return (
    <ViewerWorkstation
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      loadingProgress={loadingProgress}
      isDragging={playback.isDragging}
      isAnyVolumeLoaded={store.isAnyVolumeLoaded}
      currentDims={store.currentDims}
      maxSlices={store.maxSlices}
      slotMeta={store.slotMeta}
      sliceIndex={sliceIndex}
      setSliceIndex={setSliceIndex}
      canvasRefs={playback.canvasRefs}
      isPlaying={playback.isPlaying}
      setIsPlaying={playback.setIsPlaying}
      stopPlaying={playback.stopPlaying}
      onFilesInput={handleFilesInput}
      onClearCase={clearCase}
      onRemoveVolume={handleRemoveVolume}
      onSlotUpload={handleSlotUpload}
      onWheel={playback.handleWheel}
      onDragOver={playback.handleDragOver}
      onDragLeave={playback.handleDragLeave}
      onDrop={handleDrop}
      onScanSlice={handleScanSlice}
      onScanVolume={handleScanVolume}
    />
  );
}
