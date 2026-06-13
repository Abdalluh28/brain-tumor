import { rejectInvitationApi } from "@/services/notificationApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useRejectInvitation() {

    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (id) => rejectInvitationApi(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["notifications"],
            });
            toast.success(
                `You have rejected ${data?.radiologyCenterName} invitation`,
            );
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message ||
                "Failed to reject invitation!";
            toast.error(message);
        },
    });

    return { rejectInvitation: mutate, isLoading: isPending };
}
