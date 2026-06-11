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
import { useDeleteUser } from "@/features/settings/useDeleteUser";
import { Trash, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useDeleteUserByAdmin } from "../services/useDeleteUserByAdmin";

export default function DeleteUser({ doctor }) {

    const { deleteUserByAdmin, isLoading } = useDeleteUserByAdmin();
    const [open, setOpen] = useState(false);

    const handleFormSubmit = () => {
        deleteUserByAdmin({
            id: doctor?.id
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
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-300`}
                        >
                            <Trash className="w-4 h-4" />
                        </button>
                    </DialogTrigger>
                </TooltipTrigger>

                <TooltipContent>
                    <p>Delete</p>
                </TooltipContent>
            </Tooltip>
            <form onSubmit={handleFormSubmit}>
                <DialogContent className="p-6 sm:max-w-sm">
                    <div className="w-12 h-12 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-2">
                        <TriangleAlert className="w-6 h-6" />
                    </div>

                    <h3 className="text-slate-900 dark:text-white text-lg font-semibold">
                        Delete Doctor
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                        Are you sure you want to delete this doctor?
                    </p>


                    <div className="flex gap-3">
                        <button type="button" className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            onClick={() => { setOpen(false) }}>
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm"
                            onClick={handleFormSubmit}>
                            {isLoading ? <Spinner color="white" /> : "Delete"}
                        </button>
                    </div>
                </DialogContent>
            </form>
        </Dialog>
    )
}
