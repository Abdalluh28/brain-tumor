import FormInput from "@/components/FormInput";
import Spinner from "@/components/Spinner";
import {
    Dialog,
    DialogContent,
    DialogTrigger
} from "@/components/ui/dialog";
import { Blend, Brain, Mail, MapPinHouse, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRadiologyCenter } from "./services/useRadiologyCenter";
export default function RadiologyCenter() {

    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const { createRadiologyCenter, isLoading } = useRadiologyCenter();

    const handleCreate = (data) => {
        createRadiologyCenter(data, {
            onSuccess: () => {
                reset();
            }
        })
    }

    return (
        <>
            <Dialog>
                <form>
                    <DialogTrigger asChild>
                        <button className='bg-blue-600 hover:bg-blue-700 transition duration-300 hover:cursor-pointer text-white px-6 py-2 rounded-xl text-lg'
                        >
                            Create New Radiology Center
                        </button>
                    </DialogTrigger>
                    <DialogContent className=" md:max-w-xl">
                        <form className='w-full flex flex-col gap-4' onSubmit={handleSubmit(handleCreate)} >

                            <FormInput
                                id='name'
                                type='text'
                                label='Name'
                                icon={<User className='text-slate-600 dark:text-slate-400' />}
                                placeholder='MRC'
                                validation={{
                                    required: 'Name is required',
                                    minLength: { value: 3, message: 'Name must be at least 3 characters' },
                                }}
                                register={register}
                                errors={errors}
                            />

                            <FormInput
                                id='address'
                                type='text'
                                label='Address'
                                icon={<MapPinHouse className='text-slate-600 dark:text-slate-400' />}
                                placeholder='123 Main St'
                                validation={{
                                    required: 'Address is required',
                                }}
                                register={register}
                                errors={errors}
                            />

                            <FormInput
                                id='city'
                                type='text'
                                label='City'
                                icon={<Blend className='text-slate-600 dark:text-slate-400' />}
                                placeholder='Los Angeles'
                                validation={{
                                    required: 'City is required',
                                }}
                                register={register}
                                errors={errors}
                            />

                            <FormInput
                                id='state'
                                type='text'
                                label='State'
                                icon={<Blend className='text-slate-600 dark:text-slate-400' />}
                                placeholder='California'
                                validation={{
                                    required: 'State is required',
                                }}
                                register={register}
                                errors={errors}
                            />


                            <FormInput
                                id="zip"
                                type="text"
                                label="ZIP Code"
                                icon={<Mail className='text-slate-600 dark:text-slate-400' />}
                                placeholder="10001"
                                validation={{
                                    required: 'ZIP Code is required',
                                    pattern: {
                                        value: /^\d{5}(-\d{4})?$/,
                                        message: 'Invalid ZIP Code',
                                    }
                                }}
                                register={register}
                                errors={errors}
                            />


                            <FormInput
                                id="phone"
                                type="text"
                                label="Phone Number"
                                icon={<Brain className='text-slate-600 dark:text-slate-400' />}
                                placeholder="12345"
                                validation={{
                                    required: 'Phone Number is required',
                                    pattern: {
                                        value: /^\d+$/,
                                        message: 'Phone Number must be a number',
                                    }
                                }}
                                register={register}
                                errors={errors}
                            />


                            <button
                                type='submit'
                                disabled={isLoading}
                                className='bg-blue-600 hover:bg-blue-700 transition duration-300 hover:cursor-pointer text-white px-6 py-2 rounded-xl text-lg'>
                                {isLoading ? <Spinner color="text-white" /> : 'Create Radiology Center'}
                            </button>

                        </form>
                    </DialogContent>
                </form >
            </Dialog >
        </>
    )
}
