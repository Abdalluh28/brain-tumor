import Spinner from "@/components/Spinner";
import {
    Dialog,
    DialogContent,
    DialogTrigger
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForgotPassword } from "@/features/auth/useForgotPassword";
import { Info, KeyRound } from "lucide-react";
import { useState } from "react";

export default function ResetPassword({ doctor }) {

    const { forgotPassword, isLoading } = useForgotPassword();
    const [open, setOpen] = useState(false);

    const handleFormSubmit = () => {
        forgotPassword({
            email: doctor?.email
        }, {
            onSuccess: () => {
                setOpen(false);
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <button
                            type="button"
                            onClick={() => { }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors duration-300`}
                        >
                            <KeyRound className="w-4 h-4" />
                        </button>
                    </DialogTrigger>
                </TooltipTrigger>

                <TooltipContent>
                    <p>Reset Password</p>
                </TooltipContent>
            </Tooltip>
            <form onSubmit={handleFormSubmit}>
                <DialogContent className="p-6 sm:max-w-sm">
                    <div className="w-12 h-12 rounded-xl text-blue-500 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-2">
                        <Info className="w-6 h-6" />
                    </div>

                    <h3 className="text-slate-900 dark:text-white text-lg font-semibold">
                        Reset Password
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                        A password reset link will be sent to the doctor's email.
                    </p>


                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            onClick={() => { setOpen(false) }}>
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm"
                            onClick={handleFormSubmit}>
                            {isLoading ? <Spinner color="white" /> : "Reset Password"}
                        </button>
                    </div>
                </DialogContent>
            </form>
        </Dialog>
    )
}
