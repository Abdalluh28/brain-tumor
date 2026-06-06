import { forgotPasswordApi } from "@/services/authApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useForgotPassword = () => {
    const { mutate, isPending } = useMutation({
        mutationFn: (data) => forgotPasswordApi(data),
        onSuccess: () => {
            toast.success("Email sent successfully!");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Email sending failed!";
            toast.error(message);
        },
    });

    return { forgotPassword: mutate, isLoading: isPending };
};
