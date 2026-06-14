import { acceptInvitationApi } from "@/services/notificationApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useAcceptInvitation() {

    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (id) => acceptInvitationApi(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["notifications"],
            });
            queryClient.invalidateQueries({
                queryKey: ["unreadCount"],
            })
            queryClient.invalidateQueries({
                queryKey: ["user"],
            });
            queryClient.invalidateQueries({
                queryKey: ["centers"],
            });
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
