import authImg from '@/assets/auth.png';
import FormInput from '@/components/FormInput';
import Spinner from '@/components/Spinner';
import { Blend, Brain, CreditCard, Lock, Mail, MapPinHouse, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useRadiologyCenter } from '../dashboard/services/useRadiologyCenter';


export default function RadiologyCenter() {

    const navigate = useNavigate();
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
        <form className='w-full flex items-center' onSubmit={handleSubmit(handleCreate)} >
            <div className='lg:w-1/2 w-full flex justify-center'>
                <div className='flex flex-col gap-4 xl:w-2/3 lg:w-3/4 sm:w-2/3 w-[90%]'>
                    <div className="flex gap-2 items-center">
                        <span className="bg-primary rounded-lg px-2 py-2">
                            <Brain color="white" size={32} />
                        </span>
                        <div>
                            <p className="font-bold text-2xl">BrainTumorNet</p>
                            <p className="text-sm text-slate-500">AI-Powered Diagnosis</p>
                        </div>
                    </div>
                    <div className='flex flex-col gap-4'>

                        <FormInput
                            id="radiologyCenterId"
                            type="text"
                            label="Radiology Center ID"
                            icon={<CreditCard className='text-slate-600 dark:text-slate-400' />}
                            placeholder='123456'
                            validation={{
                                required: 'Radiology Center ID is required',
                            }}
                            register={register}
                            errors={errors}
                        />

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
                            id='city'
                            type='text'
                            label='City'
                            icon={<Blend className='text-slate-600 dark:text-slate-400' />}
                            placeholder='New York'
                            validation={{
                                required: 'City is required',
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
                            className='bg-primary text-white py-3 mt-1 rounded-xl cursor-pointer hover:bg-primary-hover transition duration-300'>
                            {isLoading ? <Spinner color="text-white" /> : 'Create Radiology Center'}
                        </button>
                        <div className='flex items-center gap-2'>
                            <span>Already have an account?</span>
                            <span className="text-primary hover:text-primary-hover cursor-pointer transition duration-300"
                                onClick={() => navigate('/login')}>Login</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className='w-1/2 h-full hidden lg:flex flex-col gap-8 items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900'>
                <div className='max-w-lg'>
                    <img src={authImg} alt="" className='w-full h-auto rounded-xl' />
                </div>
                <div className='flex flex-col gap-4 items-center justify-center'>
                    <p className='text-xl font-semibold'>
                        Advanced AI-Powered Brain Tumor Classification
                    </p>
                    <p className=' text-slate-600 dark:text-slate-400'>
                        Accurate diagnosis with clear visual explanations of each prediction
                    </p>
                </div>
            </div>
        </form>
    )
}


