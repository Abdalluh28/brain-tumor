import authImg from '@/assets/auth.png';
import FormInput from '@/components/FormInput';
import Spinner from '@/components/Spinner';
import { Brain, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useResetPassword } from './useResetPassword';


export default function ResetPassword() {

    const navigate = useNavigate();

    // form hook to handle form submission
    const { register, handleSubmit, reset, formState: { errors }, getValues } = useForm();

    const { resetPassword, isLoading } = useResetPassword();
    const { id, accessToken } = useParams();

    // form submit handler
    const handleFormSubmit = (data) => {
        resetPassword({
            id,
            accessToken,
            password: data.password
        }, {
            onSuccess: () => {
                reset();
                navigate('/login', { replace: true });
            }
        });
    }


    return (
        <form className='w-full flex items-center'
            onSubmit={handleSubmit(handleFormSubmit)}>
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
                                    message: 'Password must be at least 8 characters'
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

                        <button className='bg-primary text-white py-3 rounded-xl cursor-pointer hover:bg-primary-hover transition duration-300 flex justify-center items-center'
                            type='submit'
                            disabled={isLoading}>
                            {isLoading ? <Spinner color="text-white" /> : 'Reset Password'}
                        </button>
                        <div className='flex items-center gap-2'>
                            <span>Don't have an account?</span>
                            <span className="text-primary hover:text-primary-hover cursor-pointer transition duration-300"
                                onClick={() => navigate('/register')}>Register Now</span>
                        </div>
                    </div>
                    <p className='text-center text-sm text-slate-500'>Protected medical system • HIPAA Compliant</p>
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


