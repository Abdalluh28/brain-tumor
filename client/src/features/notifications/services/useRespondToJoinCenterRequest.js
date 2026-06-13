import { respondToJoinCenterRequestApi } from "@/services/centers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useRespondToJoinCenterRequest() {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => respondToJoinCenterRequestApi(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["notifications"],
            });

            queryClient.invalidateQueries({
                queryKey: ["unreadCount"],
            });
            queryClient.invalidateQueries({
                queryKey: ["myDoctors"],
            });

            queryClient.invalidateQueries({
                queryKey: ["availableDoctors"],
            });
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message ||
                "Failed to respond to request";
            toast.error(message);
        },
    });

    return { respondToJoinCenterRequest: mutate, isLoading: isPending };
}
