import FormInput from "@/components/FormInput";
import Spinner from "@/components/Spinner";
import { ArrowLeft, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { useChangePassword } from "./useChangePassword";

export default function ChangePassword({ onBack }) {

    const { register, handleSubmit, reset, formState: { errors }, getValues } = useForm();
    const { changePassword, isLoading } = useChangePassword();

    const handleFormSubmit = (data) => {
        changePassword(data, {
            onSuccess: () => {
                reset();
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
            <button onClick={onBack} type="button" className="text-primary flex items-center gap-1 text-sm mb-4 hover:text-primary-hover transition duration-300 cursor-pointer ">
                <ArrowLeft size={15} />
                Back to Security
            </button>

            <div>
                <p className="text-2xl font-semibold">Change Password</p>
                <p className="text-slate-500">
                    Enter your current password and choose a new one
                </p>
            </div>

            {/* inputs here */}
            <FormInput
                id='oldPassword'
                type='password'
                label='Current Password'
                icon={<Lock className='text-slate-600 dark:text-slate-400' />}
                placeholder='Enter your current password'
                validation={{
                    required: 'Current password is required'
                }}
                register={register}
                errors={errors}
            />

            <FormInput
                id='newPassword'
                type='password'
                label='New Password'
                icon={<Lock className='text-slate-600 dark:text-slate-400' />}
                placeholder='Enter your new password'
                validation={{
                    required: 'New password is required',
                    pattern: {
                        value: /.{8,}/,
                        message: 'Password must be at least 8 characters long'
                    }
                }}
                register={register}
                errors={errors}
            />

            <FormInput
                id='confirmPassword'
                type='password'
                label='Confirm Password'
                icon={<Lock className='text-slate-600 dark:text-slate-400' />}
                placeholder='Confirm your new password'
                validation={{
                    required: 'Confirm password is required',
                    validate: (value) => value === getValues('newPassword') || 'Passwords do not match'
                }}
                register={register}
                errors={errors}
            />

            <button type="submit" className="bg-primary text-white py-3 rounded-xl cursor-pointer hover:bg-primary-hover transition duration-300 mt-4">
                {isLoading ? <Spinner color="text-white" /> : 'Change Password'}
            </button>
        </form>
    );
}
