import { useForm } from "react-hook-form"
import { useUser } from "./useUser";
import FormInput from "@/components/FormInput";
import { Mail, User } from "lucide-react";
import { useUpdateUser } from "./useUpdateUser";
import Spinner from "@/components/Spinner";
import { useEffect } from "react";

export default function Profile() {

    const { user } = useUser();
    const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
        defaultValues: {
            name: '',
            email: '',
        }
    })
    const { updateUser, isLoading } = useUpdateUser();

    useEffect(() => {
        if (user) {
            reset({
                name: user.name,
                email: user.email,
            })
        }
    }, [user, reset])

    const handleFormSubmit = (data) => {
        // If form is not changed, do not submit
        if (!isDirty) return;

        const updates = {};

        if (data.name !== user?.name) updates.name = data.name;
        if (data.email !== user?.email) updates.email = data.email;

        if (Object.keys(updates).length === 0) return;

        updateUser(updates);
    }

    return (
        <>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col gap-2">
                    <p className="text-2xl font-semibold">
                        Profile Settings
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage your personal information and account details
                    </p>
                </div>
                <FormInput
                    id='name'
                    type='text'
                    label='Name'
                    icon={<User className='text-slate-600 dark:text-slate-400' />}
                    placeholder='Enter your name'
                    validation={{
                        required: 'Name is required'
                    }}
                    register={register}
                    errors={errors}
                />

                <FormInput
                    id='email'
                    type='email'
                    label='Email'
                    icon={<Mail className='text-slate-600 dark:text-slate-400' />}
                    placeholder='Enter your email'
                    validation={{
                        required: 'Email is required'
                    }}
                    register={register}
                    errors={errors}
                />

                <button type="submit" className={`self-end bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary/90 transition duration-300 ${(isLoading || !isDirty) ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'}`}
                    disabled={isLoading || !isDirty}>
                    {isLoading ? <Spinner color="text-white" /> : "Save Changes"}
                </button>
            </form>
        </>
    )
}
