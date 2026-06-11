import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogTrigger
} from "@/components/ui/dialog";
import { Mail, Pencil, User } from "lucide-react";
import FormInput from "@/components/FormInput";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useEditUserByAdmin } from "../services/useEditUserByAdmin";
import Spinner from "@/components/Spinner";

export default function EditUser({ doctor }) {

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: doctor?.name,
            email: doctor?.email,
            id: doctor?.id
        }
    })
    const { editUserByAdmin, isLoading } = useEditUserByAdmin();
    const [open, setOpen] = useState(false);

    const handleFormSubmit = (data) => {
        editUserByAdmin(data, {
            onSuccess: () => {
                setOpen(false);
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <button
                                type="button"
                                onClick={() => { }}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                            >
                                <Pencil />
                            </button>
                        </DialogTrigger>
                    </TooltipTrigger>

                    <TooltipContent>
                        <p>Edit</p>
                    </TooltipContent>
                </Tooltip>
                <DialogContent className=" md:max-w-xl">
                    <p className="text-slate-900 dark:text-white mb-2 text-2xl font-semibold">Edit Doctor</p>

                    <FormInput
                        id="name"
                        type="text"
                        label="Name"
                        icon={<User className='text-slate-600 dark:text-slate-400' />}
                        placeholder={doctor?.name}
                        validation={{
                            pattern: {
                                value: /^[A-Za-z\s]+$/i,
                                message: "Please enter a valid name",
                            },
                            minLength: {
                                value: 3,
                                message: "Please enter a valid name",
                            }
                        }}
                        register={register}
                        errors={errors}
                        defaultValue={doctor?.name} />


                    <FormInput
                        id="email"
                        type="email"
                        label="Email"
                        icon={<Mail className='text-slate-600 dark:text-slate-400' />}
                        placeholder={doctor?.email}
                        validation={{
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "Please enter a valid email",
                            },
                        }}
                        register={register}
                        errors={errors}
                        defaultValue={doctor?.email} />

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            onClick={() => { setOpen(false) }}>
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm"
                            onClick={handleSubmit(handleFormSubmit)}>
                            {isLoading ? <Spinner color="white" /> : "Save"}
                        </button>
                    </div>
                </DialogContent>
            </form>
        </Dialog>
    )
}
