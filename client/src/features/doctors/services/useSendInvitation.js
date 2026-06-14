import { sendInvitationApi } from "@/services/invitationApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useSendInvitation() {

    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => sendInvitationApi(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["availableDoctors"],
            })
            toast.success(`Invitation sent to doctor ${data?.invitation?.recipientName}`);
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to send invitation";
            toast.error(message);
        },
    });

    return { sendInvitation: mutate, isLoading: isPending };
}
