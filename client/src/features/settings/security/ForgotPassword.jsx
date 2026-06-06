import { useForgotPassword } from "@/features/auth/useForgotPassword";
import { useLogout } from "@/features/auth/useLogout";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useUser } from "../useUser";

export default function ForgotPassword({ onBack }) {
    const { user } = useUser();
    const [email, setEmail] = useState(user?.email || '');
    const { forgotPassword, isLoading: isForgotPasswordLoading } = useForgotPassword();
    const { logout } = useLogout();

    const handleForgotPassword = () => {
        forgotPassword({
            email
        }, {
            onSuccess: () => {
                logout({ reason: 'password-reset' });
            }
        })
    }

    return (
        <>
            <button onClick={onBack} className="text-primary flex items-center gap-1 text-sm mb-4 hover:text-primary-hover transition duration-300 cursor-pointer ">
                <ArrowLeft size={15} />
                Back to Security
            </button>

            <div>
                <p className="text-2xl font-semibold">Forgot Password</p>
                <p className="text-slate-500">
                    Enter your email address to reset your password
                </p>
            </div>

            {/* inputs here */}
            <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm">Email</label>
                <input type="text" id="email" className="w-full outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 px-4 py-3"
                    placeholder="Enter email address"
                    value={email || user?.email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <button
                className='text-right text-sm text-primary hover:text-primary-hover transition duration-300 cursor-pointer hover:underline hover:underline-offset-4 mt-2'
                onClick={handleForgotPassword}
                disabled={isForgotPasswordLoading}
            >
                {isForgotPasswordLoading ? "Sending email..." : "Send Reset Email"}
            </button>
        </>
    );
}
