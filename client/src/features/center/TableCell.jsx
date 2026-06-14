import Spinner from "@/components/Spinner";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, MessageCirclePlus, X } from "lucide-react";
import { useSendJoinCenterRequest } from "./services/useSendJoinCenterRequest";
import { useAcceptInvitation } from "../notifications/services/useAcceptInvitation";
import { useRejectInvitation } from "../notifications/services/useRejectInvitation";


export default function TableCell({ center }) {

    const { sendJoinCenterRequest, isLoading } = useSendJoinCenterRequest();
    const { acceptInvitation, isLoading: isAccepting } = useAcceptInvitation();
    const { rejectInvitation, isLoading: isRejecting } = useRejectInvitation();

    const handleRespond = (respond) => {
        if (respond === "accept") {
            acceptInvitation(center?.notificationId);
        } else {
            rejectInvitation(center?.notificationId);
        }
    }

    const handleSendRequest = () => {
        sendJoinCenterRequest(center._id);
    }

    return (
        <>
            <td className="py-4 px-4">
                <div className="flex items-center gap-3 ">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shrink-0  bg-blue-500">
                        {center?.name[0]}
                    </div>
                    <div>
                        <p className="text-sm text-slate-900 dark:text-white ">
                            {center?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                            {center?.city}
                        </p>
                    </div>
                </div>
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                {center?.address}
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                {center?.ownerId?.name}
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                {center?.invitationStatus === "pending" ? (
                    <>
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => handleRespond("accept")}
                                disabled={isAccepting || isRejecting}
                                className="
                                flex items-center justify-center gap-2
                                rounded-lg bg-green-600 px-3 py-2
                                text-sm font-medium text-white
                                transition hover:bg-green-700
                                disabled:opacity-60
                            "
                            >
                                {isAccepting ? (
                                    <Spinner color="text-white" />
                                ) : (
                                    <>
                                        <Check size={16} />
                                        Accept
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => handleRespond("reject")}
                                disabled={isAccepting || isRejecting}
                                className="
                                flex items-center justify-center gap-2
                                rounded-lg bg-red-600 px-3 py-2
                                text-sm font-medium text-white
                                transition hover:bg-red-700
                                disabled:opacity-60
                            "
                            >
                                {isRejecting ? (
                                    <Spinner color="text-white" />
                                ) : (
                                    <>
                                        <X size={16} />
                                        Reject
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <>

                        {center?.joinRequestStatus === "pending" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                                Pending
                            </span>
                        )}
                        {center?.joinRequestStatus === "accepted" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                Accepted
                            </span>
                        )}
                        {center?.joinRequestStatus === "rejected" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                Rejected
                            </span>
                        )}
                        {!center?.joinRequestStatus && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={handleSendRequest}
                                        disabled={isLoading}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                                    >
                                        {isLoading ? <Spinner /> : <MessageCirclePlus />}
                                    </button>
                                </TooltipTrigger>

                                <TooltipContent>
                                    <p>Request join</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </>
                )}
            </td>
        </>
    )
}
