import { changePasswordApi } from "@/services/authApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useChangePassword = () => {
    const { mutate: changePassword, isPending } = useMutation({
        mutationFn: (data) => changePasswordApi(data),
        onSuccess: () => {
            toast.success("Password changed successfully!");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to change password!";
            toast.error(message);
        },
    });

    return { changePassword, isLoading: isPending };
};
