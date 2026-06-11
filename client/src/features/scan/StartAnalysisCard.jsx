import { CircleCheckBig } from "lucide-react";
import { useCreateScan } from "./useCreateScan";
import { useDispatch, useSelector } from "react-redux";
import { clearFiles } from "./scanSlice";
import toast from "react-hot-toast";
import { useFormContext } from "react-hook-form";
import { useCallback, useEffect, useRef } from "react";
import Spinner from "@/components/Spinner";
import { useUser } from "../settings/useUser";
import ActivateAccount from "./ActivateAccount";

export default function StartAnalysisCard({ patientData, autoRun }) {
  // trigger to validate form without submitting it
  const { trigger } = useFormContext();

  const { createScan, isLoading } = useCreateScan();
  const files = useSelector((state) => state.scan.files);
  const newPatient = useSelector((state) => state.scan.newPatient);
  const dispatch = useDispatch();
  const is3DScan = patientData.scanType === "3D";
  const autoRunRef = useRef(false);

  // check if the user is active or not
  const { user } = useUser();
  const isActive = user?.status === "active";

  const handleCreateScan = useCallback(async () => {
    // validate required patient info fields based on whether we're creating a new patient
    const fieldsToValidate = ["patientId", "scanType"];

    if (newPatient) {
      fieldsToValidate.push(
        "patientName",
        "patientAge",
        "patientGender",
        "patientPhone",
      );
    }

    const isValid = await trigger(fieldsToValidate);

    if (!isValid) {
      toast.error("Please fill in all required patient information");
      return;
    }

    // all good, create scan
    createScan(
      { patientData, files },
      {
        onSuccess: () => {
          dispatch(clearFiles());
        },
      },
    );
  }, [createScan, dispatch, files, newPatient, patientData, trigger]);

  useEffect(() => {
    if (!autoRun || autoRunRef.current) return;
    if (files.filter(Boolean).length !== 4) return;

    autoRunRef.current = true;
    handleCreateScan();
  }, [autoRun, files, handleCreateScan]);


  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-700 shadow-md rounded-lg p-4 ">
      <div className="flex gap-2 text-green-500 ">
        <CircleCheckBig />
        <p>
          All 4 {is3DScan ? "3D volume" : "MRI image"} modalities validated
          successfully
        </p>
      </div>
      <div className="bg-primary/15 px-4 py-2 rounded-lg">
        <p className="text-blue-900 dark:text-blue-100 font-semibold">
          The system will analyze all 4 modalities and provide:
        </p>
        <ul className="flex flex-col gap-1 mt-2 ml-2 text-blue-800 dark:text-blue-200 text-[15px] list-inside">
          <li className="flex items-center gap-1">
            <span>•</span>
            <span>
              Comprehensive tumor classification (HGG, LGG, Metastasis, or
              Healthy)
            </span>
          </li>
          <li className="flex items-center gap-1">
            <span>•</span>
            <span>Confidence scoring and probability distribution</span>
          </li>
          <li className="flex items-center gap-1">
            <span>•</span>
            <span>
              Visual explanation highlighting regions that influenced the result
            </span>
          </li>
        </ul>
      </div>
      <button
        className={`bg-primary rounded-xl p-4 text-white hover:bg-primary-hover transition duration-300 text-lg ${isLoading || !isActive ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        onClick={handleCreateScan}
        disabled={isLoading || !isActive}
      >
        {isLoading ? <Spinner color="white" /> : "Run Multi-Modality Classification Analysis"}
      </button>
      {!isActive && <ActivateAccount />}
    </div>
  );
}
