import PatientInfoForm from "./components/PatientInfoForm";
import ViewerLockedBanner from "./components/ViewerLockedBanner";
import ViewerWorkstation from "./components/ViewerWorkstation";
import { usePatientViewerForm } from "./hooks/usePatientViewerForm";
import { useMriVolumes } from "./hooks/useMriVolumes";
import { useSlicePlayback } from "./hooks/useSlicePlayback";
import { useScanActions } from "./hooks/useScanActions";

export default function MriViewerPanel() {
  const {
    methods,
    register,
    errors,
    control,
    getValues,
    newPatient,
    isPatientInfoValid,
  } = usePatientViewerForm();

  const {
    volumes,
    sliceIndex,
    setSliceIndex,
    maxSlices,
    currentDims,
    isAnyVolumeLoaded,
    isLoading,
    loadingMessage,
    loadingProgress,
    handleFilesInput,
    handleSlotUpload,
    handleRemoveVolume,
    clearCase,
  } = useMriVolumes();

  const {
    canvasRefs,
    isPlaying,
    setIsPlaying,
    isDragging,
    handleWheel,
    handleDragOver,
    handleDragLeave,
    stopPlaying,
  } = useSlicePlayback({
    volumes,
    sliceIndex,
    setSliceIndex,
    maxSlices,
    isPatientInfoValid,
  });

  const { handleScanSlice, handleScanVolume } = useScanActions({
    volumes,
    sliceIndex,
    canvasRefs,
    getValues,
  });

  const handleDrop = (e) => {
    e.preventDefault();
    handleDragLeave();
    if (
      isPatientInfoValid &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      handleFilesInput(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 select-none">
      <PatientInfoForm
        methods={methods}
        register={register}
        errors={errors}
        control={control}
        newPatient={newPatient}
      />

      {!isPatientInfoValid ? (
        <ViewerLockedBanner />
      ) : (
        <ViewerWorkstation
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          loadingProgress={loadingProgress}
          isDragging={isDragging}
          isAnyVolumeLoaded={isAnyVolumeLoaded}
          currentDims={currentDims}
          maxSlices={maxSlices}
          volumes={volumes}
          sliceIndex={sliceIndex}
          setSliceIndex={setSliceIndex}
          canvasRefs={canvasRefs}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          stopPlaying={stopPlaying}
          onFilesInput={handleFilesInput}
          onClearCase={clearCase}
          onRemoveVolume={handleRemoveVolume}
          onSlotUpload={handleSlotUpload}
          onWheel={handleWheel}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onScanSlice={handleScanSlice}
          onScanVolume={handleScanVolume}
        />
      )}
    </div>
  );
}
