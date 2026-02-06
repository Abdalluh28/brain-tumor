import { KeyRound, Lock, Trash2 } from "lucide-react";

export default function SecurityHome({ onNavigate }) {
    return (
        <>
            <div className="flex flex-col gap-2">
                <p className="text-2xl font-semibold">Security</p>
                <p className="text-slate-600 dark:text-slate-400">
                    Manage your account security and authentication settings
                </p>
            </div>

            <div className=" rounded-lg p-4 flex items-center gap-4 cursor-pointer bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition duration-300"
                onClick={() => onNavigate('change')}>
                <span className="bg-primary/10 p-2 rounded-lg text-primary">
                    <KeyRound />
                </span>
                <div className="flex flex-col ">
                    <p className="text-lg font-semibold">Change Password</p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Update your password to keep your account secure</p>
                </div>
            </div>


            <div className=" rounded-lg p-4 flex items-center gap-4 cursor-pointer bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition duration-300"
                onClick={() => onNavigate('forgot')}>
                <span className="bg-primary/10 p-2 rounded-lg text-primary">
                    <Lock />
                </span>
                <div className="flex flex-col ">
                    <p className="text-lg font-semibold">Forgot Password</p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Reset your password if you've forgotten it</p>
                </div>
            </div>


            <div className=" rounded-lg p-4 flex items-center gap-4 cursor-pointer bg-white dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/10 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900/30 transition duration-300">
                <span className="bg-red-50 p-2 rounded-lg text-red-600">
                    <Trash2 />
                </span>
                <div className="flex flex-col ">
                    <p className="text-lg font-semibold text-red-600">Delete Account</p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Permanently delete your account and all associated data</p>
                </div>
            </div>
        </>
    );
}
