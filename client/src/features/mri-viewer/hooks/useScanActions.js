import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { clearFiles, uploadFile } from "@/features/scan/scanSlice";
import { MODALITY_KEYS } from "../constants";
import { getCanvasBlob } from "../utils/canvas";

export function useScanActions({ volumes, sliceIndex, canvasRefs, getValues }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

      const values = getValues();
      const currentFormValues = {
        ...values,
        patientId: values.patientId?.trim(),
        patientPhone: values.patientPhone?.trim(),
      };

      toast.dismiss(progressToast);
      toast.success("Current slice captured and loaded into 2D pipeline!");
      navigate("/scan", {
        state: { scanType: "MRI", patientData: currentFormValues },
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to capture slice images: " + err.message);
    }
  };

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

      toast.success("3D NIfTI case volumes linked to 3D pipeline!");
      navigate("/scan", {
        state: { scanType: "3D", patientData: getValues() },
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load volume files: " + err.message);
    }
  };

  return { handleScanSlice, handleScanVolume };
}
