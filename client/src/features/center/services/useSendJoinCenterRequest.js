import { sendJoinCenterRequestApi } from "@/services/centers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useSendJoinCenterRequest() {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => sendJoinCenterRequestApi(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["centers"],
            });
            toast.success("Request sent successfully!");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to send request";
            toast.error(message);
        },
    });

    return { sendJoinCenterRequest: mutate, isLoading: isPending };
}
