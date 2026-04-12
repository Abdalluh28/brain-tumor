import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function FormInput({ id, type, label, icon, placeholder, validation, register, errors }) {
    const [showPassword, setShowPassword] = useState(false);

    const handleShowPassword = (e) => {
        e.preventDefault();
        setShowPassword(prev => !prev);
    }


    return (
        <div className='flex flex-col gap-1'>
            <label htmlFor={id} className='text-sm text-slate-600 dark:text-slate-400'>{label}</label>
            <div className='lg:col-span-2 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl border-2 border-slate-200  dark:border-slate-600'>
                <label htmlFor={id}>
                    {icon}
                </label>
                <input type={showPassword ? 'text' : type} id={id}
                    {...register(id, validation)}
                    placeholder={placeholder}
                    className='w-full outline-none border-none bg-slate-100 dark:bg-slate-800 p-1' />
                {type === 'password' && (
                    <button type='button' className='cursor-pointer' onClick={handleShowPassword}>
                        {showPassword ? (
                            <Eye size={20} />
                        ) : (
                            <EyeOff size={20} />
                        )}
                    </button>
                )}
            </div>
            {errors[id] && <span className='text-xs text-red-500'>{errors[id].message}</span>}
        </div>
    )
}
