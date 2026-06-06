import { resetPasswordApi } from "@/services/authApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useResetPassword = () => {
    const { mutate, isPending } = useMutation({
        mutationFn: (data) => resetPasswordApi(data),
        onSuccess: () => {
            toast.success("Password reset successfully!");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to reset password!";
            toast.error(message);
        },
    });

    return { resetPassword: mutate, isLoading: isPending };
};
