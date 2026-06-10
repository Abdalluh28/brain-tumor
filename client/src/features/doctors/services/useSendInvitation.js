import { sendInvitationApi } from "@/services/invitationApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useSendInvitation() {
    const { mutate, isPending } = useMutation({
        mutationFn: (data) => sendInvitationApi(data),
        onSuccess: (data) => {
            toast.success(`Invitation sent to doctor ${data?.name}`);
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to send invitation";
            toast.error(message);
        },
    });

    return { sendInvitation: mutate, isLoading: isPending };
}
