import { markAllAsReadApi } from "@/services/notificationApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useMarkAllAsRead() {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: () => markAllAsReadApi(),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["notifications"],
            });
            queryClient.invalidateQueries({
                queryKey: ["unreadCount"],
            });
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to mark as read!";
            toast.error(message);
        },
    });

    return { markAllAsRead: mutate, isLoading: isPending };
}
