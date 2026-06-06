import { registerApi } from "@/services/authApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useRegister = () => {

    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => registerApi(data),
        onSuccess: () => {
            toast.success("Registration successful!");
            queryClient.invalidateQueries({
                queryKey: ["user"],
            })
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Registration failed!";
            toast.error(message);
        },
    });

    return { register: mutate, isLoading: isPending };
};
