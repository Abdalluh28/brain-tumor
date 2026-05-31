import PatientInfoForm from "./components/PatientInfoForm";
import ViewerLockedBanner from "./components/ViewerLockedBanner";
import MriViewerWorkspace from "./MriViewerWorkspace";
import { usePatientViewerForm } from "./hooks/usePatientViewerForm";

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
        <MriViewerWorkspace getValues={getValues} />
      )}
    </div>
  );
}
