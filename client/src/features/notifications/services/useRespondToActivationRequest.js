import { respondToActivationRequestApi } from "@/services/notificationApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useRespondToActivationRequest() {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => respondToActivationRequestApi(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["notifications"],
            });
            queryClient.invalidateQueries({
                queryKey: ["unreadCount"],
            })
            queryClient.invalidateQueries({
                queryKey: ["myDoctors"],
            });
            if (data.action === "accept") {
                toast.success(`Dr ${data?.name} activated successfully!`);
            } else if (data.action === "reject") {
                toast.success("Request rejected successfully!");
            }
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message ||
                "Failed to respond to request";
            toast.error(message);
        },
    });

    return { respondToActivationRequest: mutate, isLoading: isPending };
}
