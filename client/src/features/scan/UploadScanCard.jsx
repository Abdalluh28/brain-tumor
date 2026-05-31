import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { removeFile, uploadFile } from "./scanSlice";
import StartAnalysisCard from "./StartAnalysisCard";
import UploadBanner from "./UploadBanner";
import UploadSlot from "./UploadSlot";
import { useFormContext, useWatch } from "react-hook-form";

export default function UploadScanCard({ autoRun }) {
  const { control } = useFormContext();
  const patientData = useWatch({
    control,
  });

  const files = useSelector((state) => state.scan.files);
  const is3DScan = patientData.scanType === "3D";

  // Count uploaded files (ignore null values)
  const uploadedSlots = files.filter(Boolean).length;
  const emptySlots = 4 - uploadedSlots;

  const dispatch = useDispatch();

  // Validate uploaded file
  const validateFile = (file) => {
    const imageTypes = ["image/jpeg", "image/png", "image/jpg"];
    const medicalExtensions = [".nii", ".nii.gz", ".dcm"];
    const maxSize = 100 * 1024 * 1024; // 100MB

    const isImage = imageTypes.includes(file.type);

    const isMedical = medicalExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );

    if (!isImage && !isMedical) {
      toast.error("Unsupported file type");
      return false;
    }

    if (patientData.scanType === "MRI" && !isImage) {
      toast.error("Please upload an image file");
      return false;
    }

    if (patientData.scanType === "3D" && !isMedical) {
      toast.error("Please upload a 3D medical volume");
      return false;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds 100MB");
      return false;
    }

    return true;
  };

  // Handle upload for specific slot
  const handleUpload = (e, slotIndex) => {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file
    if (!validateFile(file)) {
      e.target.value = null;
      return;
    }

    const isImage = file.type.startsWith("image/");

    // Handle image upload
    if (isImage) {
      const reader = new FileReader();

      reader.onloadend = () => {
        dispatch(
          uploadFile({
            index: slotIndex,
            file: {
              id: crypto.randomUUID(),
              name: file.name,
              size: file.size,
              type: "image",
              previewURL: reader.result,
              rawFile: file,
            },
          }),
        );
      };

      reader.readAsDataURL(file);
    }

    // Handle medical files
    else {
      dispatch(
        uploadFile({
          index: slotIndex,
          file: {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.name.toLowerCase().endsWith(".dcm") ? "dicom" : "nifti",
            rawFile: file,
          },
        }),
      );
    }

    // Reset input
    e.target.value = null;
  };

  // Remove file from specific slot
  const deleteFile = (index) => {
    dispatch(removeFile(index));
  };

  // Check if all slots are filled
  const allSlotsFilled = uploadedSlots === 4;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Status Banner */}
      <UploadBanner uploadedSlots={uploadedSlots} emptySlots={emptySlots} />

      {/* Upload Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((item) => (
          <UploadSlot
            key={item}
            index={item}
            file={files[item]}
            onUpload={(e) => handleUpload(e, item)}
            onDelete={deleteFile}
            disabled={allSlotsFilled && !files[item]}
            scanType={patientData.scanType}
          />
        ))}
      </div>

      {/* Start Analysis */}
      {allSlotsFilled ? (
        <StartAnalysisCard patientData={patientData} autoRun={autoRun} />
      ) : (
        <div className="w-fit self-center">
          <p className=" text-white dark:text-black text-center bg-primary dark:bg-primary-foreground px-8 py-4 rounded-full">
            Upload all 4 {is3DScan ? "3D volume" : "MRI image"} modalities to
            start analysis
          </p>
        </div>
      )}
    </div>
  );
}
