import { Button } from "@/components/ui/button"
import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"

export default function Profile() {
    return (
        <>
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col gap-2">
                    <p className="text-2xl font-semibold">
                        Profile Settings
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage your personal information and account details
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="name" className="text-sm">Name</label>
                    <input type="text" id="name" className="w-full outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 px-4 py-3"
                        defaultValue={'Abdo Khaled'} />
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm">Email</label>
                    <input type="text" id="email" className="w-full outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 px-4 py-3"
                        defaultValue={'abdo@gamil.com'} />
                </div>
            </div>
        </>
    )
}
