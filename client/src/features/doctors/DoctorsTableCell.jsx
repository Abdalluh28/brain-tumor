import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { KeyRound, MessageCirclePlus, Pencil, Power, PowerOff, Trash } from "lucide-react";
import { useSendInvitation } from "./services/useSendInvitation";
import Spinner from "@/components/Spinner";
import EditUser from "./components/EditUser";
import ResetPassword from "./components/ResetPassword";
import ActivateUser from "./components/ActivateUser";
import DeleteUser from "./components/DeleteUser";


export default function DoctorsTableCell({ doctor, invitePage }) {

    const { sendInvitation, isLoading } = useSendInvitation();
    const isActive = doctor?.status === "active";


    return (
        <>
            <td className="py-4 px-4">
                <div className="flex items-center gap-3 ">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shrink-0  bg-blue-500">
                        {doctor?.name[0]}
                    </div>
                    <div>
                        <p className="text-sm text-slate-900 dark:text-white ">
                            Dr. {doctor?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                            {doctor?.email}
                        </p>
                    </div>
                </div>
            </td>
            {invitePage ? (
                <>
                    <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{doctor?.experience}</td>
                    <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{doctor?.radiologyCenter?.name || "N/A"}</td>
                </>
            ) : (
                <>
                    <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{doctor?.updatedAt.split('T')[0]}</td>
                    <td className='py-4 px-4'>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${isActive ? ' bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                            <div className={`w-1.5 h-1.5 mt-0.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                            {doctor?.status}
                        </span>
                    </td>
                    <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{doctor?.scanCount}</td>
                </>
            )}

            <td className="px-4 py-4">
                <div className="flex items-center gap-1">
                    {invitePage ? (
                        <>
                            {doctor.invitationStatus === "pending" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                                    Pending
                                </span>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => sendInvitation(doctor)}
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                                        >
                                            {isLoading ? <Spinner /> : <MessageCirclePlus />}
                                        </button>
                                    </TooltipTrigger>

                                    <TooltipContent>
                                        <p>Invite</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </>
                    ) : (
                        <>
                            <EditUser doctor={doctor} />
                            <ResetPassword doctor={doctor} />
                            <ActivateUser doctor={doctor} isActive={isActive} />
                            <DeleteUser doctor={doctor} />
                        </>
                    )}
                </div>
            </td >
        </>
    )
}
