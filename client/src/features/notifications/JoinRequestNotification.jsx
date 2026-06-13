import { useState } from "react";
import { useRespondToJoinCenterRequest } from "./services/useRespondToJoinCenterRequest";
import Spinner from "@/components/Spinner";
import toast from "react-hot-toast";

export default function JoinRequestNotification({ notification }) {

    const { respondToJoinCenterRequest, isLoading } = useRespondToJoinCenterRequest();
    const [action, setAction] = useState();

    const handleRespond = (action) => {
        respondToJoinCenterRequest({ notificationId: notification.id, action }, {
            onSuccess: (data) => {
                console.log(data)
                if (data.action === "accept") {
                    toast.success(`Dr ${data?.name} joined successfully!`);
                } else if (data.action === "reject") {
                    toast.success("Request rejected successfully!");
                }
            }
        });
    }

    return (
        <div className="flex flex-col gap-2 p-3 border-b border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
                {notification.message}
            </p>
            <div className="grid grid-cols-2 gap-2">
                <button className="text-sm text-white bg-primary px-3 py-1 rounded-xl text-center hover:bg-primary-hover transition duration-300 cursor-pointer"
                    onClick={() => {
                        setAction("accept");
                        handleRespond("accept");
                    }}>
                    {isLoading && action === "accept" ? <Spinner color="text-white" /> : "Accept"}
                </button>
                <button className="text-sm text-white bg-red-600 px-3 py-1 rounded-xl text-center hover:bg-red-700 transition duration-300 cursor-pointer"
                    onClick={() => {
                        setAction("reject");
                        handleRespond("reject");
                    }}>
                    {isLoading && action === "reject" ? <Spinner color="text-white" /> : "Reject"}
                </button>
            </div>
        </div>
    )
}
