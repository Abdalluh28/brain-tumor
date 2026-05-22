import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function FormInput({ id, type, label, icon, placeholder, validation, register, errors }) {
    const [showPassword, setShowPassword] = useState(false);

    const handleShowPassword = (e) => {
        e.preventDefault();
        setShowPassword(prev => !prev);
    }

    const handleNoPasswordCopy = (e) => {
        if (type === 'password') {
            e.preventDefault();
        }
    }

    return (
        <div className='w-full'>
            <label
                htmlFor={id}
                className='block mb-2 text-foreground/90'
            >
                {label}
            </label>

            <div className='relative'>
                <div className='relative'>
                    <div className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
                        {icon}
                    </div>

                    <input
                        id={id}
                        type={showPassword ? 'text' : type}
                        placeholder={placeholder}
                        className='w-full h-11 px-4 rounded-lg border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed pl-10'
                        {...register(id, validation)}
                        onCopy={handleNoPasswordCopy}
                    />
                </div>
                {type === 'password' && (
                    <button type='button' className='absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer' onClick={handleShowPassword}>
                        {showPassword ? (
                            <Eye size={20} />
                        ) : (
                            <EyeOff size={20} />
                        )}
                    </button>
                )}
            </div>

            {errors[id] && (
                <p className='text-red-600 mt-1'>
                    {errors[id]}
                </p>
            )}
        </div>
    )
}
