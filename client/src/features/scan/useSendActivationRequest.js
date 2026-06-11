import { sendActivationRequestApi } from "@/services/invitationApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useSendActivationRequest() {
    const { mutate, isPending } = useMutation({
        mutationFn: (data) => sendActivationRequestApi(data),
        onSuccess: () => {
            toast.success("Request sent successfully!");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to send request";
            toast.error(message);
        },
    });

    return { sendActivationRequest: mutate, isLoading: isPending };
}
