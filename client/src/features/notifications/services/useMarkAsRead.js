import { markAsReadApi } from "@/services/notificationApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useMarkAsRead() {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (id) => markAsReadApi(id),
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

    return { markAsRead: mutate, isLoading: isPending };
}
