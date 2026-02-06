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
import { Lock, Settings, User } from "lucide-react";
import { useState } from "react";
import Profile from "./Profile";
import Security from "./security/Security";

export function SettingsModal() {

    const [openSecurity, setOpenSecurity] = useState(false);


    return (
        <Dialog>
            <form>
                <DialogTrigger asChild>
                    <div className="cursor-pointer hover:text-primary transition duration-300 hover:animate-[spin_1s_ease-in-out_1]">
                        <Settings />
                    </div>
                </DialogTrigger>
                <DialogContent className=" md:max-w-xl">
                    <div className="flex gap-2 w-full">
                        <div className=" flex flex-col gap-4 border-r border-slate-200 dark:border-slate-600">
                            <button className={`cursor-pointer p-2 rounded-xl mr-2 ${!openSecurity ? 'bg-primary text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'} transition duration-300`}
                                onClick={() => setOpenSecurity(false)}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <User size={28} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Profile</p>
                                    </TooltipContent>
                                </Tooltip>
                            </button>
                            <button className={`cursor-pointer p-2 rounded-xl mr-2 ${openSecurity ? 'bg-primary text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'} transition duration-300`}
                                onClick={() => setOpenSecurity(true)}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Lock size={28} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Security</p>
                                    </TooltipContent>
                                </Tooltip>
                            </button>
                        </div>
                        <div className="pl-3">
                            {openSecurity ? (
                                < Security />
                            ) : (
                                < Profile />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </form>
        </Dialog>
    )
}
