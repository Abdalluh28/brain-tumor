import { UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import Notifications from "./Notifications";

export default function DoctorsHeader({ invitePage = false }) {
    return (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-5 pt-16 lg:pt-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-slate-900 dark:text-white text-3xl font-semibold">Doctor Management</h1>
                        <span className="text-xs mt-2 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">Administrator</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Manage and monitor all doctors</p>
                </div>
                <div className="flex items-center gap-4">
                    <Notifications />
                    {invitePage ? (
                        <Link to='/doctors' className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-auto">
                            <span>Doctors</span>
                        </Link>
                    ) : (
                        <Link to='/doctors/invite' className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm">
                            <UserPlus />
                            <span>Invite Doctors</span>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
