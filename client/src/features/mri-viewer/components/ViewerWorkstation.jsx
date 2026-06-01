import { useRef } from "react";
import {
  viewerWorkstation,
  viewerWorkstationDragging,
} from "../viewerTheme";
import ViewerLoadingOverlay from "./ViewerLoadingOverlay";
import ViewerToolbar from "./ViewerToolbar";
import ViewerEmptyState from "./ViewerEmptyState";
import ModalityGrid from "./ModalityGrid";
import SliceControls from "./SliceControls";
import ScanPipelineActions from "./ScanPipelineActions";

export default function ViewerWorkstation({
  isLoading,
  loadingMessage,
  loadingProgress,
  isDragging,
  isAnyVolumeLoaded,
  currentDims,
  maxSlices,
  slotMeta,
  sliceIndex,
  setSliceIndex,
  canvasRefs,
  isPlaying,
  setIsPlaying,
  stopPlaying,
  onFilesInput,
  onClearCase,
  onRemoveVolume,
  onSlotUpload,
  onWheel,
  onDragOver,
  onDragLeave,
  onDrop,
  onScanSlice,
  onScanVolume,
}) {
  const fileInputRef = useRef(null);

  const handleClearCase = () => {
    onClearCase();
    stopPlaying();
  };

  return (
    <div
      className={`${viewerWorkstation} ${isDragging ? viewerWorkstationDragging : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isLoading && (
        <ViewerLoadingOverlay message={loadingMessage} progress={loadingProgress} />
      )}

      <ViewerToolbar
        fileInputRef={fileInputRef}
        onFilesSelected={onFilesInput}
        isAnyVolumeLoaded={isAnyVolumeLoaded}
        onClearCase={handleClearCase}
        currentDims={currentDims}
        maxSlices={maxSlices}
      />

      {!isAnyVolumeLoaded && (
        <ViewerEmptyState onBrowse={() => fileInputRef.current?.click()} />
      )}

      {isAnyVolumeLoaded && (
        <ModalityGrid
          slotMeta={slotMeta}
          sliceIndex={sliceIndex}
          canvasRefs={canvasRefs}
          onRemoveVolume={onRemoveVolume}
          onSlotUpload={onSlotUpload}
          onWheel={onWheel}
        />
      )}

      {isAnyVolumeLoaded && (
        <SliceControls
          sliceIndex={sliceIndex}
          maxSlices={maxSlices}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onPrevSlice={() => setSliceIndex(Math.max(0, sliceIndex - 1))}
          onNextSlice={() =>
            setSliceIndex(Math.min(maxSlices - 1, sliceIndex + 1))
          }
          onResetToCenter={() => {
            setSliceIndex(Math.round(maxSlices / 2));
            stopPlaying();
          }}
          onSliceChange={(idx) => {
            setSliceIndex(idx);
            stopPlaying();
          }}
        />
      )}

      {isAnyVolumeLoaded && (
        <ScanPipelineActions
          sliceIndex={sliceIndex}
          onScanSlice={onScanSlice}
          onScanVolume={onScanVolume}
        />
      )}
    </div>
  );
}
