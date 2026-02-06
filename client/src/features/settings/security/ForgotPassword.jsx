import { ArrowLeft } from "lucide-react";

export default function ForgotPassword({ onBack }) {
    return (
        <>
            <button onClick={onBack} className="text-primary flex items-center gap-1 text-sm">
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
                    defaultValue={'abdo@gamil.com'} />
            </div>
        </>
    );
}
