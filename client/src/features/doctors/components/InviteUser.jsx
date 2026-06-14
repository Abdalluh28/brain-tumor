import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { useSendInvitation } from "../services/useSendInvitation";
import Spinner from "@/components/Spinner";
import { MessageCirclePlus } from "lucide-react";
import { useRespondToJoinCenterRequest } from "@/features/notifications/services/useRespondToJoinCenterRequest";
import { useState } from "react";
import toast from "react-hot-toast";

export default function InviteUser({ doctor }) {
    const { sendInvitation, isLoading } = useSendInvitation();
    const { respondToJoinCenterRequest, isLoading: isResponding } = useRespondToJoinCenterRequest();
    const [action, setAction] = useState();

    const handleRespond = (action) => {
        respondToJoinCenterRequest({ notificationId: doctor.joinRequestNotificationId, action }, {
            onSuccess: (data) => {
                if (data.action === "accept") {
                    toast.success(`Dr ${data?.name} joined successfully!`);
                } else if (data.action === "reject") {
                    toast.success("Request rejected successfully!");
                }
            }
        });
    }

    return (
        <>
            {doctor.invitationStatus === "pending" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                    Pending
                </span>
            ) :
                <>
                    {doctor.joinRequestStatus === 'pending' ? (
                        <div className="grid grid-cols-2 gap-2">
                            <button className="text-sm text-white bg-green-600 px-3 py-1 rounded-xl text-center hover:bg-green-700 transition duration-300 cursor-pointer"
                                onClick={() => {
                                    setAction("accept");
                                    handleRespond("accept");
                                }}>
                                {isResponding && action === "accept" ? <Spinner color="text-white" /> : "Accept"}
                            </button>
                            <button className="text-sm text-white bg-red-600 px-3 py-1 rounded-xl text-center hover:bg-red-700 transition duration-300 cursor-pointer"
                                onClick={() => {
                                    setAction("reject");
                                    handleRespond("reject");
                                }}>
                                {isResponding && action === "reject" ? <Spinner color="text-white" /> : "Reject"}
                            </button>
                        </div>
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
            }
        </>
    )
}
