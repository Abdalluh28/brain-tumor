import { ArrowLeft } from "lucide-react";

export default function ChangePassword({ onBack }) {
    return (
        <>
            <button onClick={onBack} className="text-primary flex items-center gap-1 text-sm">
                <ArrowLeft size={15} />
                Back to Security
            </button>

            <div>
                <p className="text-2xl font-semibold">Change Password</p>
                <p className="text-slate-500">
                    Enter your current password and choose a new one
                </p>
            </div>

            {/* inputs here */}
            <div className="flex flex-col gap-2">
                <label htmlFor="oldPass" className="text-sm font-semibold">Old Password</label>
                <input type="password" id="oldPass" className="w-full outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 px-4 py-3"
                    placeholder="Enter current password" />
            </div>
            <div className="flex flex-col gap-2">
                <label htmlFor="newPass" className="text-sm font-semibold">New Password</label>
                <input type="password" id="newPass" className="w-full outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 px-4 py-3"
                    placeholder="Enter new password" />
            </div>
            <div className="flex flex-col gap-2">
                <label htmlFor="newPassConfirm" className="text-sm font-semibold">Confirm New Password</label>
                <input type="password" id="newPassConfirm" className="w-full outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 px-4 py-3"
                    placeholder="Confirm new password" />
            </div>
        </>
    );
}
