import { acceptInvitationApi } from "@/services/notificationApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useAcceptInvitation() {
    const { mutate, isPending } = useMutation({
        mutationFn: (id) => acceptInvitationApi(id),
        onSuccess: (data) => {
            console.log(data);
            toast.success(`You have joined ${data?.radiologyCenterName}`);
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message ||
                "Failed to accept invitation!";
            toast.error(message);
        },
    });

    return { acceptInvitation: mutate, isLoading: isPending };
}
