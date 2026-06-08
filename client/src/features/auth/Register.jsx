import authImg from '@/assets/auth.png';
import FormInput from '@/components/FormInput';
import Spinner from '@/components/Spinner';
import { Brain, Lock, Mail, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useRegister } from './useRegister';


export default function Register() {

    const navigate = useNavigate();
    const { register, handleSubmit, reset, formState: { errors }, getValues, watch, setValue } = useForm({
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'doctor'
        }
    });
    const { register: registerApi, isLoading } = useRegister();

    const role = watch("role");

    const handleRegister = (data) => {
        registerApi(data, {
            onSuccess: () => {
                reset();
                navigate('/', { replace: true });
            }
        })
    }

    return (
        <form className='w-full flex items-center' onSubmit={handleSubmit(handleRegister)} >
            <div className='lg:w-1/2 w-full flex justify-center'>
                <div className='flex flex-col gap-8 xl:w-2/3 lg:w-3/4 sm:w-2/3 w-[90%]'>
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
                        <div className='flex flex-col gap-2'>
                            <p>Register as</p>
                            <div className='grid grid-cols-2 gap-2'>
                                <input type="hidden" {...register('role', {
                                    required: 'Role is required'
                                })} />

                                <button className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${role === 'doctor' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-300 bg-gray-50 dark:bg-gray-800/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/20 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                    type='button'
                                    onClick={() => setValue('role', 'doctor')}>
                                    <Stethoscope />
                                    <span>Doctor</span>
                                </button>

                                <button className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${role === 'admin' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-gray-300 bg-gray-50 dark:bg-gray-800/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/20 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                    type='button'
                                    onClick={() => setValue('role', 'admin')}>
                                    <ShieldCheck />
                                    <span>Admin</span>
                                </button>
                            </div>
                        </div>

                        <FormInput
                            id='name'
                            type='text'
                            label='Name'
                            icon={<User className='text-slate-600 dark:text-slate-400' />}
                            placeholder='John Doe'
                            validation={{
                                required: 'Name is required',
                                minLength: { value: 3, message: 'Name must be at least 3 characters' },
                            }}
                            register={register}
                            errors={errors}
                        />

                        <FormInput
                            id='email'
                            type='email'
                            label='Email'
                            icon={<Mail className='text-slate-600 dark:text-slate-400' />}
                            placeholder='abdo@gamil.com'
                            validation={{
                                required: 'Email is required',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Invalid email address',
                                }
                            }}
                            register={register}
                            errors={errors}
                        />

                        <FormInput
                            id="password"
                            type="password"
                            label="Password"
                            icon={<Lock className='text-slate-600 dark:text-slate-400' />}
                            placeholder="••••••••"
                            validation={{
                                required: 'Password is required',
                                pattern: {
                                    value: /.{8,}/,
                                    message: 'Password must be at least 8 characters',
                                }
                            }}
                            register={register}
                            errors={errors}
                        />

                        <FormInput
                            id="confirmPassword"
                            type="password"
                            label="Confirm Password"
                            icon={<Lock className='text-slate-600 dark:text-slate-400' />}
                            placeholder="••••••••"
                            validation={{
                                required: 'Confirm Password is required',
                                validate: value => value === getValues('password') || 'Passwords do not match'
                            }}
                            register={register}
                            errors={errors}
                        />

                        <button
                            type='submit'
                            disabled={isLoading}
                            className={`w-full py-3 text-white rounded-xl transition-colors flex items-center justify-center gap-2 ${role === 'doctor' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400'}`}
                        >
                            {isLoading ? <Spinner color="text-white" /> : 'Register'}
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


