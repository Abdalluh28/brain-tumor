import { useState } from "react";
import { UserPlus, Check, X } from "lucide-react";
import { useRespondToJoinCenterRequest } from "./services/useRespondToJoinCenterRequest";
import Spinner from "@/components/Spinner";
import toast from "react-hot-toast";

export default function JoinRequestNotification({ notification }) {
    const { respondToJoinCenterRequest, isLoading } =
        useRespondToJoinCenterRequest();

    const [action, setAction] = useState(null);

    const handleRespond = (action) => {
        setAction(action);

        respondToJoinCenterRequest(
            {
                notificationId: notification.id,
                action,
            },
            {
                onSuccess: (data) => {
                    if (data.action === "accept") {
                        toast.success(
                            `Dr ${data.name} joined successfully!`
                        );
                    } else {
                        toast.success("Request rejected successfully!");
                    }
                },
            }
        );
    };

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
                            disabled={isLoading}
                            className="
                                flex items-center justify-center gap-2
                                rounded-lg bg-green-600 px-3 py-2
                                text-sm font-medium text-white
                                transition hover:bg-green-700
                                disabled:opacity-60
                            "
                        >
                            {isLoading && action === "accept" ? (
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
                            disabled={isLoading}
                            className="
                                flex items-center justify-center gap-2
                                rounded-lg bg-red-600 px-3 py-2
                                text-sm font-medium text-white
                                transition hover:bg-red-700
                                disabled:opacity-60
                            "
                        >
                            {isLoading && action === "reject" ? (
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
    );
}