import { updateUserApi } from "@/services/userApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    const { mutate, isPending, isError } = useMutation({
        mutationFn: (data) => updateUserApi(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["user"],
            });
            toast.success("User updated successfully!");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to update user!";
            toast.error(message);
        },
    });

    return { updateUser: mutate, isLoading: isPending, isError };
};
