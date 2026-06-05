import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import {
  clearViewerCase,
  setViewerSliceIndex,
  setViewerVolumes,
} from "@/features/scan/scanSlice";
import { MODALITY_NAMES } from "../constants";
import {
  detectModalitySlotIndex,
  isNiftiFileName,
  parseNiftiFile,
  parseNiftiFilesParallel,
  yieldToUi,
} from "../utils/nifti";
import { toSlotMeta } from "./useVolumeStore";

function volumesToViewerEntries(volumes) {
  return volumes.map((volumeData) => {
    if (!volumeData) return null;
    return {
      file: volumeData.file,
      fileName: volumeData.file.name,
      slices: volumeData.slices,
      cols: volumeData.cols,
      rows: volumeData.rows,
    };
  });
}

function mergeIntoStore(store, parsed) {
  const data = [...store.dataRef.current];
  const meta = [...store.slotMeta];

  for (const { file, volumeData } of parsed) {
    const targetIdx = detectModalitySlotIndex(file.name);
    if (targetIdx !== -1) {
      data[targetIdx] = volumeData;
      meta[targetIdx] = toSlotMeta(volumeData);
      continue;
    }

    const emptyIdx = data.indexOf(null);
    if (emptyIdx !== -1) {
      data[emptyIdx] = volumeData;
      meta[emptyIdx] = toSlotMeta(volumeData);
    } else {
      toast.error(`All 4 slots occupied. Could not map file: ${file.name}`);
    }
  }

  return { data, meta };
}

export function useMriVolumes(store, { onBeforeVolumeUpdate } = {}) {
  const dispatch = useDispatch();
  const persistedVolumes = useSelector((state) => state.scan.viewerVolumes);
  const persistedSliceIndex = useSelector((state) => state.scan.viewerSliceIndex);
  const restoreAttemptedRef = useRef(false);

  const [sliceIndex, setSliceIndexState] = useState(persistedSliceIndex ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);

  const syncViewerState = useCallback(() => {
    dispatch(setViewerVolumes(volumesToViewerEntries(store.getVolumes())));
  }, [dispatch, store]);

  const setSliceIndex = useCallback(
    (value) => {
      setSliceIndexState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        dispatch(setViewerSliceIndex(next));
        return next;
      });
    },
    [dispatch],
  );

  const startLoading = useCallback((message) => {
    setLoadingMessage(message);
    setLoadingProgress(5);
    setIsLoading(true);
  }, []);

  const endLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingProgress(0);
    setLoadingMessage("");
  }, []);

  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    const hasPersisted = persistedVolumes.some((entry) => entry !== null);
    if (!hasPersisted) return;

    (async () => {
      startLoading("Restoring previous case...");
      await yieldToUi();

      try {
        onBeforeVolumeUpdate?.();
        const data = [null, null, null, null];
        const meta = [null, null, null, null];

        for (let i = 0; i < persistedVolumes.length; i++) {
          const entry = persistedVolumes[i];
          if (!entry?.file) continue;

          const volumeData = await parseNiftiFile(entry.file);
          data[i] = volumeData;
          meta[i] = toSlotMeta(volumeData);
        }

        store.replaceAll(data, meta);
        setSliceIndexState(persistedSliceIndex ?? 0);
        store.scheduleRedraw();
      } catch (err) {
        console.error(err);
        toast.error("Could not restore previous volumes: " + err.message);
        dispatch(clearViewerCase());
      } finally {
        endLoading();
      }
    })();
    // Restore once on mount from the persisted Redux snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusMiddleSlice = useCallback((meta) => {
    const first = meta.find((m) => m !== null);
    if (first) {
      setSliceIndex(Math.round(first.slices / 2));
    }
  }, [setSliceIndex]);

  const handleFilesInput = useCallback(
    async (selectedFiles) => {
      if (selectedFiles.length === 0) return;

      const filesArr = Array.from(selectedFiles);
      const validFiles = filesArr.filter((f) => isNiftiFileName(f.name));
      filesArr
        .filter((f) => !isNiftiFileName(f.name))
        .forEach((file) => {
          toast.error(
            `File "${file.name}" is not a NIfTI volume (.nii/.nii.gz)`,
          );
        });

      if (validFiles.length === 0) return;

      startLoading(
        validFiles.length === 1
          ? `Loading ${validFiles[0].name}...`
          : `Loading ${validFiles.length} volumes in parallel...`,
      );
      await yieldToUi();

      try {
        onBeforeVolumeUpdate?.();

        let parsed;
        if (validFiles.length > 1) {
          setLoadingMessage(`Parsing ${validFiles.length} files...`);
          parsed = await parseNiftiFilesParallel(validFiles);
        } else {
          setLoadingMessage(`Parsing ${validFiles[0].name}...`);
          const volumeData = await parseNiftiFile(validFiles[0]);
          parsed = [{ file: validFiles[0], volumeData }];
        }

        setLoadingProgress(95);
        const { data, meta } = mergeIntoStore(store, parsed);
        store.replaceAll(data, meta);
        focusMiddleSlice(meta);
        syncViewerState();
        endLoading();
        store.scheduleRedraw();
        toast.success("NIfTI case files processed successfully!");
      } catch (err) {
        console.error(err);
        toast.error("Error reading NIfTI files: " + err.message);
        endLoading();
      }
    },
    [store, startLoading, endLoading, focusMiddleSlice, onBeforeVolumeUpdate, syncViewerState],
  );

  const handleSlotUpload = useCallback(
    async (e, slotIdx) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!isNiftiFileName(file.name)) {
        toast.error("Please upload a NIfTI volume (.nii or .nii.gz)");
        return;
      }

      startLoading(`Parsing ${MODALITY_NAMES[slotIdx]}...`);
      await yieldToUi();

      try {
        onBeforeVolumeUpdate?.();
        const volumeData = await parseNiftiFile(file);
        store.setVolumeAt(slotIdx, volumeData);
        setSliceIndex((prev) =>
          prev === 0 ? Math.round(volumeData.slices / 2) : prev,
        );
        syncViewerState();
        endLoading();
        store.scheduleRedraw();
        toast.success(`${MODALITY_NAMES[slotIdx]} volume loaded!`);
      } catch (err) {
        console.error(err);
        toast.error("Error parsing file: " + err.message);
        endLoading();
      }
    },
    [store, startLoading, endLoading, onBeforeVolumeUpdate, syncViewerState, setSliceIndex],
  );

  const handleRemoveVolume = useCallback(
    (idx) => {
      onBeforeVolumeUpdate?.();
      store.clearSlot(idx);
      syncViewerState();
      store.scheduleRedraw();
    },
    [store, onBeforeVolumeUpdate, syncViewerState],
  );

  const clearCase = useCallback(() => {
    onBeforeVolumeUpdate?.();
    store.clearAll();
    setSliceIndex(0);
    dispatch(clearViewerCase());
  }, [store, onBeforeVolumeUpdate, setSliceIndex, dispatch]);

  return {
    sliceIndex,
    setSliceIndex,
    isLoading,
    loadingMessage,
    loadingProgress,
    handleFilesInput,
    handleSlotUpload,
    handleRemoveVolume,
    clearCase,
  };
}
