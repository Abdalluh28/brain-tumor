import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { setViewerPatientInfo } from "@/features/scan/scanSlice";

function viewerPatientInfoChanged(current, next) {
  if (!current) return true;
  return (
    current.patientId !== next.patientId ||
    current.patientName !== next.patientName ||
    current.patientAge !== next.patientAge ||
    current.patientGender !== next.patientGender ||
    current.patientPhone !== next.patientPhone ||
    current.notes !== next.notes
  );
}

const defaultPatientValues = {
  patientId: "",
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientPhone: "",
  notes: "",
};

export function usePatientViewerForm() {
  const dispatch = useDispatch();
  const viewerPatientInfo = useSelector(
    (state) => state.scan.viewerPatientInfo,
  );
  const newPatient = useSelector((state) => state.scan.newPatient);

  const methods = useForm({
    defaultValues: viewerPatientInfo || defaultPatientValues,
    mode: "onChange",
  });

  const {
    register,
    formState: { errors },
    watch,
    control,
    getValues,
  } = methods;

  const watchedId = watch("patientId");
  const watchedName = watch("patientName");
  const watchedAge = watch("patientAge");
  const watchedGender = watch("patientGender");
  const watchedPhone = watch("patientPhone");
  const watchedNotes = watch("notes");

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

  const isIdValid = /^[0-9]{15}$/.test(watchedId);
  const isPatientInfoValid =
    isIdValid &&
    (!newPatient ||
      (watchedName?.length >= 2 &&
        /^[0-9]+$/.test(watchedAge) &&
        watchedGender &&
        /^01(0|1|2|5)[0-9]{8}$/.test(watchedPhone)));

  return {
    methods,
    register,
    errors,
    control,
    getValues,
    newPatient,
    isPatientInfoValid,
  };
}
