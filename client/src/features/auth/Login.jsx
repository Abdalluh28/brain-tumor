import authImg from '@/assets/auth.png'
import { Brain, Lock, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'


export default function Login() {

    const navigate = useNavigate();

    return (
        <div className='w-full flex items-center'>
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
                    <div className='flex flex-col gap-2'>
                        <p className='text-2xl font-semibold'>Welcome Back</p>
                        <p className='text-sm text-slate-500'>Sign in to access your medical AI dashboard</p>
                    </div>
                    <div className='flex flex-col gap-4'>
                        <div className='flex flex-col gap-1'>
                            <label htmlFor='email' className='text-sm text-slate-600 dark:text-slate-400'>Email Address</label>
                            <div className='lg:col-span-2 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl border-2 border-slate-200'>
                                <label htmlFor='email'>
                                    <Mail className='text-slate-600 dark:text-slate-400' />
                                </label>
                                <input type="text" id='email'
                                    placeholder='Doctor@gmail.com'
                                    className='w-full outline-none border-none bg-slate-100 dark:bg-slate-800 p-1' />
                            </div>
                        </div>

                        <div className='flex flex-col gap-1'>
                            <label htmlFor='password' className='text-sm text-slate-600 dark:text-slate-400'>Password</label>
                            <div className='lg:col-span-2 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl border-2 border-slate-200'>
                                <label htmlFor='password'>
                                    <Lock className='text-slate-600 dark:text-slate-400' />
                                </label>
                                <input type="password" id='password'
                                    placeholder='••••••••'
                                    className='w-full outline-none border-none bg-slate-100 dark:bg-slate-800 p-1' />
                            </div>
                        </div>

                        {/* handle forgot by enter email to reset password (not have to navigate to custom page) */}
                        <div className='text-right text-sm text-primary hover:text-primary-hover transition duration-300 cursor-pointer'>
                            Forgot Password?
                        </div>
                        <button className='bg-primary text-white py-3 rounded-xl cursor-pointer hover:bg-primary-hover transition duration-300'>
                            Login
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
                        Accurate diagnosis with explainable AI technology using Grad-CAM visualization
                    </p>
                </div>
            </div>
        </div>
    )
}


