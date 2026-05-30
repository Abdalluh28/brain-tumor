import React, { useState, useRef, useEffect } from "react";
import * as nifti from "nifti-reader-js";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Controller, FormProvider, useForm } from "react-hook-form";
import FormInput from "@/components/FormInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  uploadFile,
  clearFiles,
  setNewPatient,
  setViewerVolumes,
  setViewerSliceIndex,
  setViewerPatientInfo,
} from "@/features/scan/scanSlice";
import toast from "react-hot-toast";
import {
  Upload,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Box,
  LayoutGrid,
  Eye,
  FileUp,
  Brain,
  HelpCircle,
  IdCard,
  NotebookText,
  Phone,
  User,
  AlertCircle,
} from "lucide-react";

const MODALITY_NAMES = [
  "T1-weighted (T1)",
  "T1-contrast enhanced (T1ce)",
  "T2-weighted (T2)",
  "FLAIR",
];
const MODALITY_KEYS = ["T1N", "T1C", "T2W", "T2F"];

export default function MriViewerPanel() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux selectors for persistent viewer state
  const volumes = useSelector((state) => state.scan.viewerVolumes);
  const sliceIndex = useSelector((state) => state.scan.viewerSliceIndex);
  const viewerPatientInfo = useSelector(
    (state) => state.scan.viewerPatientInfo,
  );
  const newPatient = useSelector((state) => state.scan.newPatient);

  // Local loading and playing state (non-persistent UX states)
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRefs = useRef([null, null, null, null]);
  const fileInputRef = useRef(null);
  const slotInputRefs = useRef([null, null, null, null]);
  const playTimerRef = useRef(null);

  // Initialize React Hook Form with persistent values
  const methods = useForm({
    defaultValues: viewerPatientInfo || {
      patientId: "",
      patientName: "",
      patientAge: "",
      patientGender: "",
      patientPhone: "",
      notes: "",
    },
    mode: "onChange",
  });

  const {
    register,
    formState: { errors },
    watch,
    control,
    setValue,
  } = methods;

  // Watch individual values to avoid creating object references on every render
  const watchedId = watch("patientId");
  const watchedName = watch("patientName");
  const watchedAge = watch("patientAge");
  const watchedGender = watch("patientGender");
  const watchedPhone = watch("patientPhone");
  const watchedNotes = watch("notes");

  const viewerPatientInfoChanged = (current, next) => {
    if (!current) return true;
    return (
      current.patientId !== next.patientId ||
      current.patientName !== next.patientName ||
      current.patientAge !== next.patientAge ||
      current.patientGender !== next.patientGender ||
      current.patientPhone !== next.patientPhone ||
      current.notes !== next.notes
    );
  };

  // Save patient form data to Redux on change only when it actually changes.
  useEffect(() => {
    const nextViewerPatientInfo = {
      patientId: watchedId || "",
      patientName: watchedName || "",
      patientAge: watchedAge || "",
      patientGender: watchedGender || "",
      patientPhone: watchedPhone || "",
      notes: watchedNotes || "",
    };

    if (viewerPatientInfoChanged(viewerPatientInfo, nextViewerPatientInfo)) {
      dispatch(setViewerPatientInfo(nextViewerPatientInfo));
    }
  }, [
    watchedId,
    watchedName,
    watchedAge,
    watchedGender,
    watchedPhone,
    watchedNotes,
    viewerPatientInfo,
    dispatch,
  ]);

  // Validation checks to unlock the viewer grid
  const isIdValid = /^[0-9]{15}$/.test(watchedId);
  const isPatientInfoValid =
    isIdValid &&
    (!newPatient ||
      (watchedName?.length >= 2 &&
        /^[0-9]+$/.test(watchedAge) &&
        watchedGender &&
        /^01(0|1|2|5)[0-9]{8}$/.test(watchedPhone)));

  // Calculate details from active volume
  const activeVolume = volumes.find((v) => v !== null);
  const maxSlices = activeVolume ? activeVolume.slices : 0;
  const currentDims = activeVolume
    ? `${activeVolume.cols} × ${activeVolume.rows}`
    : "N/A";

  // State setters mapping to Redux actions
  const setVolumes = (newVols) => dispatch(setViewerVolumes(newVols));
  const setSliceIndex = (idx) => dispatch(setViewerSliceIndex(idx));

  // Parse NIfTI file helper
  const parseNiftiFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let buffer = e.target.result;
          if (nifti.isCompressed(buffer)) {
            buffer = nifti.decompress(buffer);
          }
          if (!nifti.isNIFTI(buffer)) {
            reject(
              new Error(`File "${file.name}" is not a valid NIfTI volume.`),
            );
            return;
          }

          const header = nifti.readHeader(buffer);
          const image = nifti.readImage(header, buffer);

          let typedData;
          if (header.datatypeCode === 2) {
            typedData = new Uint8Array(image);
          } else if (header.datatypeCode === 4) {
            typedData = new Int16Array(image);
          } else if (header.datatypeCode === 8) {
            typedData = new Int32Array(image);
          } else if (header.datatypeCode === 16) {
            typedData = new Float32Array(image);
          } else if (header.datatypeCode === 64) {
            typedData = new Float64Array(image);
          } else if (header.datatypeCode === 512) {
            typedData = new Uint16Array(image);
          } else if (header.datatypeCode === 768) {
            typedData = new Uint32Array(image);
          } else {
            typedData = new Int16Array(image);
          }

          // Calculate global min/max for intensity scaling (contrast scaling)
          let min = typedData[0];
          let max = typedData[0];
          for (let i = 0; i < typedData.length; i++) {
            if (typedData[i] < min) min = typedData[i];
            if (typedData[i] > max) max = typedData[i];
          }

          resolve({
            file,
            header,
            typedData,
            min,
            max,
            slices: header.dims[3],
            cols: header.dims[1],
            rows: header.dims[2],
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () =>
        reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle files selection
  const handleFilesInput = async (selectedFiles) => {
    if (selectedFiles.length === 0) return;
    setIsLoading(true);
    setLoadingProgress(0);

    const filesArr = Array.from(selectedFiles);
    const newVolumes = [...volumes];

    try {
      for (let i = 0; i < filesArr.length; i++) {
        const file = filesArr[i];
        const name = file.name.toLowerCase();

        if (!name.endsWith(".nii") && !name.endsWith(".nii.gz")) {
          toast.error(
            `File "${file.name}" is not a NIfTI volume (.nii/.nii.gz)`,
          );
          continue;
        }

        setLoadingMessage(`Reading and parsing ${file.name}...`);
        setLoadingProgress(Math.round((i / filesArr.length) * 100));

        const volumeData = await parseNiftiFile(file);

        // Auto-detect modality from filename
        let targetIdx = -1;
        if (
          name.includes("t1ce") ||
          name.includes("t1c") ||
          name.includes("t1_ce") ||
          name.includes("t1-ce")
        ) {
          targetIdx = 1;
        } else if (name.includes("t1")) {
          targetIdx = 0;
        } else if (name.includes("t2")) {
          targetIdx = 2;
        } else if (name.includes("flair") || name.includes("flr")) {
          targetIdx = 3;
        }

        if (targetIdx !== -1) {
          newVolumes[targetIdx] = volumeData;
        } else {
          // Match to first empty slot
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

      // Set sliceIndex to middle slice of first loaded volume
      const firstLoaded = newVolumes.find((v) => v !== null);
      if (firstLoaded) {
        setSliceIndex(Math.round(firstLoaded.slices / 2));
      }

      toast.success("NIfTI Case files processed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error reading NIfTI files: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Slot-specific upload
  const handleSlotUpload = async (e, slotIdx) => {
    const file = e.target.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".nii") && !name.endsWith(".nii.gz")) {
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

      // Auto set sliceIndex if not set
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

  // Trigger slice drawing on canvas
  const drawSlice = (
    canvas,
    header,
    typedData,
    sliceIdx,
    globalMin,
    globalMax,
  ) => {
    if (!canvas || !header || !typedData) return;

    const cols = header.dims[1];
    const rows = header.dims[2];
    const totalSlices = header.dims[3];

    // Ensure sliceIdx remains in bounds for this volume
    const safeSlice = Math.max(0, Math.min(totalSlices - 1, sliceIdx));

    canvas.width = cols;
    canvas.height = rows;

    const ctx = canvas.getContext("2d");
    const canvasImageData = ctx.createImageData(cols, rows);

    const sliceSize = cols * rows;
    const sliceOffset = safeSlice * sliceSize;
    const range = globalMax - globalMin || 1;

    for (let r = 0; r < rows; r++) {
      // Flip vertically to display anatomy correctly in browser canvas coordinates
      const niftiRow = rows - r - 1;
      const niftiRowOffset = sliceOffset + niftiRow * cols;
      const canvasRowOffset = r * cols;

      for (let c = 0; c < cols; c++) {
        const val = typedData[niftiRowOffset + c];
        // Linear scaling to grayscale 0-255
        const normVal = Math.round(((val - globalMin) / range) * 255);
        const clampedVal = Math.max(0, Math.min(255, normVal));

        const canvasIdx = (canvasRowOffset + c) * 4;
        canvasImageData.data[canvasIdx] = clampedVal; // R
        canvasImageData.data[canvasIdx + 1] = clampedVal; // G
        canvasImageData.data[canvasIdx + 2] = clampedVal; // B
        canvasImageData.data[canvasIdx + 3] = 255; // A (alpha)
      }
    }

    ctx.putImageData(canvasImageData, 0, 0);
  };

  // Draw canvas whenever sliceIndex or volumes change
  useEffect(() => {
    if (isPatientInfoValid) {
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
    }
  }, [sliceIndex, volumes, isPatientInfoValid]);

  // Keyboard navigation listener
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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [maxSlices, sliceIndex, isPatientInfoValid]);

  // Mouse wheel navigation helper
  const handleWheel = (e) => {
    if (maxSlices === 0 || !isPatientInfoValid) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const next = sliceIndex + delta;
    setSliceIndex(Math.max(0, Math.min(maxSlices - 1, next)));
  };

  // Cinematic scroll timer
  useEffect(() => {
    if (isPlaying && maxSlices > 0 && isPatientInfoValid) {
      playTimerRef.current = setInterval(() => {
        const next = sliceIndex + 1;
        setSliceIndex(next >= maxSlices ? 0 : next);
      }, 80); // scroll speed
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    }
    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, maxSlices, sliceIndex, isPatientInfoValid]);

  // Drag-and-drop event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (isPatientInfoValid) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (
      isPatientInfoValid &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      handleFilesInput(e.dataTransfer.files);
    }
  };

  // Remove single volume
  const handleRemoveVolume = (idx) => {
    const newVolumes = [...volumes];
    newVolumes[idx] = null;
    setVolumes(newVolumes);
  };

  // Helper to extract canvas blob
  const getCanvasBlob = (canvas) => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/png");
    });
  };

  // Action: "Scan this slice" (2D MRI scan)
  const handleScanSlice = async () => {
    if (volumes.some((v) => v === null)) {
      toast.error("Please load all 4 modalities to scan this slice");
      return;
    }

    try {
      const progressToast = toast.loading("Capturing slice images...");
      const filePromises = volumes.map(async (vol, idx) => {
        const canvas = canvasRefs.current[idx];
        const blob = await getCanvasBlob(canvas);
        const fileName = `${MODALITY_KEYS[idx]}_slice_${sliceIndex}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        return {
          id: crypto.randomUUID(),
          name: fileName,
          size: file.size,
          type: "image",
          previewURL: URL.createObjectURL(blob),
          rawFile: file,
        };
      });

      const filesForRedux = await Promise.all(filePromises);

      dispatch(clearFiles());
      filesForRedux.forEach((fileObj, idx) => {
        dispatch(uploadFile({ index: idx, file: fileObj }));
      });

      const values = methods.getValues();
      const currentFormValues = {
        ...values,
        patientId: values.patientId?.trim(),
        patientPhone: values.patientPhone?.trim(),
      };

      toast.dismiss(progressToast);
      toast.success("Current slice captured and loaded into 2D pipeline!");
      navigate("/scan", {
        state: {
          scanType: "MRI",
          patientData: currentFormValues,
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to capture slice images: " + err.message);
    }
  };

  // Action: "Scan entire volume" (3D volume scan)
  const handleScanVolume = () => {
    if (volumes.some((v) => v === null)) {
      toast.error("Please load all 4 modalities to scan the case");
      return;
    }

    try {
      dispatch(clearFiles());
      volumes.forEach((vol, idx) => {
        dispatch(
          uploadFile({
            index: idx,
            file: {
              id: crypto.randomUUID(),
              name: vol.file.name,
              size: vol.file.size,
              type: "nifti",
              rawFile: vol.file,
            },
          }),
        );
      });

      const currentFormValues = methods.getValues();

      toast.success("3D NIfTI case volumes linked to 3D pipeline!");
      navigate("/scan", {
        state: {
          scanType: "3D",
          patientData: currentFormValues,
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load volume files: " + err.message);
    }
  };

  const isAnyVolumeLoaded = volumes.some((v) => v !== null);

  return (
    <div className="w-full flex flex-col gap-8 select-none">
      {/* Patient Info Form Block */}
      <FormProvider {...methods}>
        <form
          className="w-full items-end grid grid-cols-1 lg:grid-cols-2 gap-4 bg-white dark:bg-background border border-slate-200 dark:border-slate-800 shadow-md rounded-xl px-5 py-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <FormInput
            id="patientId"
            label="Patient ID"
            type="text"
            placeholder="12345678"
            icon={<IdCard className="w-5 h-5" />}
            validation={{
              required: "Patient ID is required",
              pattern: {
                value: /^[0-9]{15}$/,
                message: "Patient ID must be 15 digits",
              },
            }}
            register={register}
            errors={errors}
          />

          {newPatient && (
            <>
              <FormInput
                id="patientName"
                label="Patient Name"
                type="text"
                placeholder="John Doe"
                icon={<User className="w-5 h-5" />}
                validation={{
                  required: "Patient Name is required",
                  minLength: {
                    value: 2,
                    message: "Patient Name must be at least 2 characters",
                  },
                }}
                register={register}
                errors={errors}
              />

              <FormInput
                id="patientAge"
                label="Patient Age"
                type="text"
                placeholder="25"
                icon={<User className="w-5 h-5" />}
                validation={{
                  required: "Patient Age is required",
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "Patient Age must be a number",
                  },
                }}
                register={register}
                errors={errors}
              />

              {/* Gender Select */}
              <div className="flex items-end">
                <Controller
                  name="patientGender"
                  control={control}
                  rules={{ required: "Patient Gender is required" }}
                  render={({ field }) => (
                    <div className="w-full">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.patientGender && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.patientGender.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              <FormInput
                id="patientPhone"
                label="Patient Phone"
                type="text"
                placeholder="1234567890"
                icon={<Phone className="w-5 h-5" />}
                validation={{
                  required: "Patient Phone is required",
                  pattern: {
                    value: /^01(0|1|2|5)[0-9]{8}$/,
                    message: "Patient Phone must be a valid phone number",
                  },
                }}
                register={register}
                errors={errors}
              />

              <FormInput
                id="notes"
                label="Notes"
                type="text"
                placeholder="Notes"
                icon={<NotebookText className="w-5 h-5" />}
                register={register}
                errors={errors}
              />
            </>
          )}

          {/* Toggle new patient trigger */}
          <div className="flex items-center gap-1 text-sm py-3 text-slate-500">
            <p>
              {newPatient ? "Patient already exists?" : "Adding new patient?"}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                dispatch(setNewPatient(!newPatient));
              }}
              className="text-primary underline underline-offset-2 cursor-pointer transition duration-300 hover:text-primary-hover"
            >
              Click here
            </button>
          </div>
        </form>
      </FormProvider>

      {/* Lock state panel if Patient ID is invalid */}
      {!isPatientInfoValid ? (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-12 h-12 text-amber-500 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-200">
            Patient Details Required
          </h3>
          <p className="text-slate-400 max-w-md text-sm">
            Please provide a valid 15-digit Patient ID (and fill out patient
            fields if adding a new patient) at the top of the panel to unlock
            the multi-modality viewer.
          </p>
        </div>
      ) : (
        /* Main Workstation Viewport */
        <div
          className={`w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-6 text-slate-100 flex flex-col gap-6 relative transition duration-300 ${isDragging ? "border-primary bg-slate-900/90 ring-4 ring-primary/20" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/80 rounded-2xl flex flex-col items-center justify-center gap-4 z-50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-xl font-medium text-slate-200">
                  {loadingMessage}
                </p>
                <div className="w-64 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {loadingProgress}% completed
                </p>
              </div>
            </div>
          )}

          {/* Workstation Header Toolbar */}
          <div className="flex justify-between items-center flex-wrap gap-4 pb-4 border-b border-slate-800">
            <div className="flex gap-3">
              <button
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium cursor-pointer transition"
                onClick={() => fileInputRef.current.click()}
              >
                <FolderOpen className="w-5 h-5" />
                Load Patient Case
              </button>
              <input
                type="file"
                multiple
                accept=".nii,.nii.gz"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => handleFilesInput(e.target.files)}
              />
              {isAnyVolumeLoaded && (
                <button
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium cursor-pointer transition"
                  onClick={() => {
                    setVolumes([null, null, null, null]);
                    setSliceIndex(0);
                    setIsPlaying(false);
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                  Clear Case
                </button>
              )}
            </div>

            {isAnyVolumeLoaded && (
              <div className="flex items-center gap-6 text-sm font-mono text-slate-400">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase">
                    Resolution
                  </span>
                  <span className="text-slate-200">{currentDims}</span>
                </div>
                <div className="w-px bg-slate-800 h-8"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase">
                    Synchronized Slices
                  </span>
                  <span className="text-slate-200">{maxSlices} Slices</span>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {!isAnyVolumeLoaded && (
            <div
              className="border-2 border-dashed border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer gap-4 transition"
              onClick={() => fileInputRef.current.click()}
            >
              <div className="p-4 bg-primary/10 text-primary rounded-full">
                <Upload size={40} className="animate-bounce" />
              </div>
              <div className="flex flex-col gap-1 max-w-md">
                <p className="text-xl font-semibold">
                  Load a BraTS MRI Scan Case
                </p>
                <p className="text-slate-400 text-sm">
                  Click here to select or drag & drop 4 co-registered NIfTI
                  files (.nii or .nii.gz) representing T1, T1ce, T2, and FLAIR
                  modalities.
                </p>
              </div>
              <div className="flex gap-2 text-xs font-mono text-slate-500 mt-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                <span>
                  💡 Tip: Files containing 't1', 't1ce', 't2', 'flair' are
                  auto-mapped!
                </span>
              </div>
            </div>
          )}

          {/* 2x2 Synchronized Grid */}
          {isAnyVolumeLoaded && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
              onWheel={handleWheel}
            >
              {[0, 1, 2, 3].map((idx) => {
                const vol = volumes[idx];
                return (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex flex-col relative aspect-square shadow-inner group"
                  >
                    {/* Modality Label */}
                    <div className="absolute top-3 left-3 bg-slate-900/90 text-xs font-semibold px-2.5 py-1.5 rounded-lg backdrop-blur text-primary border border-slate-800 z-15 uppercase font-mono">
                      {MODALITY_NAMES[idx].split(" ")[0]}
                    </div>
                    {/* Slice Metadata Overlay */}
                    <div className="absolute top-3 right-3 bg-slate-900/90 text-xs px-2.5 py-1.5 rounded-lg backdrop-blur text-slate-300 border border-slate-800 z-15 font-mono">
                      {vol
                        ? `Slice ${sliceIndex + 1}/${vol.slices}`
                        : "No Volume"}
                    </div>

                    {vol ? (
                      <>
                        {/* File Name Overlay */}
                        <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 text-[10px] px-2.5 py-1.5 rounded-lg backdrop-blur text-slate-400 border border-slate-800 z-15 font-mono truncate">
                          {vol.file.name}
                        </div>
                        <button
                          className="absolute bottom-3 right-3 bg-red-950/90 hover:bg-red-900/95 text-red-400 text-xs font-semibold px-2.5 py-1.5 rounded-lg backdrop-blur border border-red-900/50 z-20 cursor-pointer hidden group-hover:block transition"
                          onClick={() => handleRemoveVolume(idx)}
                        >
                          Remove
                        </button>
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          <canvas
                            ref={(el) => (canvasRefs.current[idx] = el)}
                            className="w-full h-full object-contain cursor-ns-resize"
                          />
                        </div>
                      </>
                    ) : (
                      /* Individual Upload Slot */
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950/70 border-2 border-dashed border-slate-800 rounded-xl m-2 self-center max-w-[calc(100%-1rem)] max-h-[calc(100%-1rem)]">
                        <FileUp className="w-10 h-10 text-slate-700 mb-3" />
                        <p className="font-semibold text-slate-400 text-sm mb-1">
                          {MODALITY_NAMES[idx]}
                        </p>
                        <p className="text-slate-600 text-xs mb-4">
                          No volume mapped to this slot
                        </p>
                        <button
                          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 px-3.5 py-1.5 rounded-lg cursor-pointer transition"
                          onClick={() => slotInputRefs.current[idx].click()}
                        >
                          Select NIfTI File
                        </button>
                        <input
                          type="file"
                          accept=".nii,.nii.gz"
                          className="hidden"
                          ref={(el) => (slotInputRefs.current[idx] = el)}
                          onChange={(e) => handleSlotUpload(e, idx)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Navigation Scrubber Panel */}
          {isAnyVolumeLoaded && (
            <div className="flex flex-col gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                  <button
                    className={`p-3 rounded-lg border cursor-pointer transition ${isPlaying ? "bg-primary border-primary text-white" : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"}`}
                    onClick={() => setIsPlaying(!isPlaying)}
                    title={
                      isPlaying ? "Pause cinematic loop" : "Play cinematic loop"
                    }
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 rounded-lg text-slate-300 cursor-pointer transition"
                    onClick={() => setSliceIndex(Math.max(0, sliceIndex - 1))}
                    disabled={sliceIndex === 0}
                    title="Previous slice"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 rounded-lg text-slate-300 cursor-pointer transition"
                    onClick={() =>
                      setSliceIndex(Math.min(maxSlices - 1, sliceIndex + 1))
                    }
                    disabled={sliceIndex === maxSlices - 1}
                    title="Next slice"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 rounded-lg text-slate-400 cursor-pointer transition"
                    onClick={() => {
                      setSliceIndex(Math.round(maxSlices / 2));
                      setIsPlaying(false);
                    }}
                    title="Reset to center slice"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                {/* Slider Scrub */}
                <div className="flex-1 min-w-[200px] flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono">0</span>
                  <input
                    type="range"
                    min={0}
                    max={maxSlices - 1}
                    value={sliceIndex}
                    onChange={(e) => {
                      setSliceIndex(parseInt(e.target.value));
                      setIsPlaying(false);
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary border border-slate-700"
                  />
                  <span className="text-xs text-slate-500 font-mono">
                    {maxSlices - 1}
                  </span>
                </div>

                {/* Position Indicator */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-lg text-sm font-mono text-slate-300">
                  <span>SLICE</span>
                  <span className="text-primary font-bold text-base">
                    {sliceIndex + 1}
                  </span>
                  <span className="text-slate-600">/</span>
                  <span>{maxSlices}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-900 pt-3 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                  <span>
                    Control shortcuts: Use Keyboard Up/Right/Down/Left arrows or
                    hover and scroll mouse wheel to navigate slices.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pipeline Submit Actions */}
          {isAnyVolumeLoaded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              {/* 2D Slice Scanner */}
              <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-xl flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-lg">
                    <Sparkles className="w-5 h-5" />
                    <h3>Scan Current Slice (2D Mode)</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Capture this specific cross-section (Slice #{sliceIndex + 1}
                    ) across all 4 modalities. The 4 generated 2D PNG images and
                    patient details will be pre-loaded into the standard MRI
                    classification pipeline.
                  </p>
                </div>
                <button
                  className="bg-primary hover:bg-primary-hover text-white rounded-xl p-3.5 font-medium cursor-pointer transition text-center shadow-lg hover:shadow-primary/10"
                  onClick={handleScanSlice}
                >
                  Capture & Scan Slice #{sliceIndex + 1}
                </button>
              </div>

              {/* 3D Case Scanner */}
              <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-xl flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-lg">
                    <Box className="w-5 h-5" />
                    <h3>Scan Full Volume (3D Mode)</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Send the full 3D co-registered volumes and patient details
                    directly into the 3D pipeline. This executes volumetric
                    tumor localization, classification, and volumetric
                    segmentation analysis.
                  </p>
                </div>
                <button
                  className="bg-slate-850 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl p-3.5 font-medium cursor-pointer transition text-center shadow-lg"
                  onClick={handleScanVolume}
                >
                  Submit 3D Volumetric Case
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
