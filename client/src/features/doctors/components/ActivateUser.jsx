import Spinner from "@/components/Spinner";
import {
    Dialog,
    DialogContent
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Power, PowerOff, Triangle, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useEditUserByAdmin } from "../services/useEditUserByAdmin";
import { DialogTrigger } from "@radix-ui/react-dialog";

export default function ActivateUser({ doctor, isActive }) {

    const { editUserByAdmin, isLoading } = useEditUserByAdmin();
    const [open, setOpen] = useState(false);


    const handleFormSubmit = () => {
        editUserByAdmin({
            id: doctor?.id,
            status: isActive ? "inactive" : "active"
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
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 ${isActive ? 'hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 ' : 'hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'} transition-colors duration-300`}
                        >
                            {isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                    </DialogTrigger>
                </TooltipTrigger>

                <TooltipContent>
                    <p>{isActive ? "Deactivate" : "Activate"}</p>
                </TooltipContent>
            </Tooltip>
            <form onSubmit={handleFormSubmit}>
                <DialogContent className="p-6 sm:max-w-sm">
                    <div className={`w-12 h-12 rounded-xl ${isActive ? "text-orange-500 bg-orange-50 dark:bg-orange-900/20" : "text-blue-500 bg-blue-50 dark:bg-blue-900/20"} flex items-center justify-center mb-2`}>
                        {isActive ? (
                            <TriangleAlert className="w-6 h-6" />
                        ) : (
                            <Info className="w-6 h-6" />
                        )}
                    </div>

                    <h3 className="text-slate-900 dark:text-white text-lg font-semibold">
                        {isActive ? "Confirm Deactivation" : "Activate"}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                        {isActive ? (
                            <>
                                Are you sure you want to deactivate this user?
                            </>
                        ) : (
                            <>
                                Activate Dr. {doctor?.name}?
                            </>
                        )}
                    </p>


                    <div className="flex gap-3">
                        <button type="button" className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            onClick={() => { setOpen(false) }}>
                            Cancel
                        </button>
                        <button type="submit" className={`flex-1 px-4 py-2.5 ${isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl transition-colors text-sm`}
                            onClick={handleFormSubmit}>
                            {isLoading ? <Spinner color="white" /> :
                                <>
                                    {isActive ? "Deactivate" : "Activate"}
                                </>
                            }
                        </button>
                    </div>
                </DialogContent>
            </form>
        </Dialog>
    )
}
