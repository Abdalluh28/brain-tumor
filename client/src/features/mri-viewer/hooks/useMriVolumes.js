import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  setViewerVolumes,
  setViewerSliceIndex,
} from "@/features/scan/scanSlice";
import { MODALITY_NAMES } from "../constants";
import {
  detectModalitySlotIndex,
  isNiftiFileName,
  parseNiftiFile,
} from "../utils/nifti";

export function useMriVolumes() {
  const dispatch = useDispatch();
  const volumes = useSelector((state) => state.scan.viewerVolumes);
  const sliceIndex = useSelector((state) => state.scan.viewerSliceIndex);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);

  const setVolumes = (newVols) => dispatch(setViewerVolumes(newVols));
  const setSliceIndex = (idx) => dispatch(setViewerSliceIndex(idx));

  const activeVolume = volumes.find((v) => v !== null);
  const maxSlices = activeVolume ? activeVolume.slices : 0;
  const currentDims = activeVolume
    ? `${activeVolume.cols} × ${activeVolume.rows}`
    : "N/A";
  const isAnyVolumeLoaded = volumes.some((v) => v !== null);

  const setSliceToFirstLoadedMiddle = (newVolumes) => {
    const firstLoaded = newVolumes.find((v) => v !== null);
    if (firstLoaded) {
      setSliceIndex(Math.round(firstLoaded.slices / 2));
    }
  };

  const handleFilesInput = async (selectedFiles) => {
    if (selectedFiles.length === 0) return;
    setIsLoading(true);
    setLoadingProgress(0);

    const filesArr = Array.from(selectedFiles);
    const newVolumes = [...volumes];

    try {
      for (let i = 0; i < filesArr.length; i++) {
        const file = filesArr[i];

        if (!isNiftiFileName(file.name)) {
          toast.error(
            `File "${file.name}" is not a NIfTI volume (.nii/.nii.gz)`,
          );
          continue;
        }

        setLoadingMessage(`Reading and parsing ${file.name}...`);
        setLoadingProgress(Math.round((i / filesArr.length) * 100));

        const volumeData = await parseNiftiFile(file);
        const targetIdx = detectModalitySlotIndex(file.name);

        if (targetIdx !== -1) {
          newVolumes[targetIdx] = volumeData;
        } else {
          const emptyIdx = newVolumes.indexOf(null);
          if (emptyIdx !== -1) {
            newVolumes[emptyIdx] = volumeData;
          } else {
            toast.error(
              `All 4 slots occupied. Could not map file: ${file.name}`,
            );
          }
        }
      }

      setVolumes(newVolumes);
      setSliceToFirstLoadedMiddle(newVolumes);
      toast.success("NIfTI Case files processed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error reading NIfTI files: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotUpload = async (e, slotIdx) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isNiftiFileName(file.name)) {
      toast.error("Please upload a NIfTI volume (.nii or .nii.gz)");
      return;
    }

    setIsLoading(true);
    setLoadingMessage(`Parsing volume for ${MODALITY_NAMES[slotIdx]}...`);
    try {
      const volumeData = await parseNiftiFile(file);
      const newVolumes = [...volumes];
      newVolumes[slotIdx] = volumeData;
      setVolumes(newVolumes);

      if (sliceIndex === 0) {
        setSliceIndex(Math.round(volumeData.slices / 2));
      }

      toast.success(`${MODALITY_NAMES[slotIdx]} volume loaded!`);
    } catch (err) {
      console.error(err);
      toast.error("Error parsing file: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveVolume = (idx) => {
    const newVolumes = [...volumes];
    newVolumes[idx] = null;
    setVolumes(newVolumes);
  };

  const clearCase = () => {
    setVolumes([null, null, null, null]);
    setSliceIndex(0);
  };

  return {
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
  };
}
