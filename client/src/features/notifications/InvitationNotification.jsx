import { Check, UserPlus, X } from "lucide-react";
import { useAcceptInvitation } from "./services/useAcceptInvitation";
import { useRejectInvitation } from "./services/useRejectInvitation";
import Spinner from "@/components/Spinner";

export default function InvitationNotification({ notification }) {

    const { acceptInvitation, isLoading: isAccepting } = useAcceptInvitation();
    const { rejectInvitation, isLoading: isRejecting } = useRejectInvitation();

    const handleRespond = (respond) => {
        if (respond === "accept") {
            acceptInvitation(notification.id);
        } else {
            rejectInvitation(notification.id);
        }
    }

    return (
        <div className="border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <UserPlus className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                        {notification.message}
                    </p>

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
                </div>
            </div>
        </div>
    )
}
