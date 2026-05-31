import { useDispatch } from "react-redux";
import { Controller, FormProvider } from "react-hook-form";
import FormInput from "@/components/FormInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setNewPatient } from "@/features/scan/scanSlice";
import { IdCard, NotebookText, Phone, User } from "lucide-react";

export default function PatientInfoForm({
  methods,
  register,
  errors,
  control,
  newPatient,
}) {
  const dispatch = useDispatch();

  return (
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

            <div className="flex items-end">
              <Controller
                name="patientGender"
                control={control}
                rules={{ required: "Patient Gender is required" }}
                render={({ field }) => (
                  <div className="w-full">
                    <Select onValueChange={field.onChange} value={field.value}>
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
  );
}
