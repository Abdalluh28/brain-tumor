import { deleteUserApi } from "@/services/userApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useDeleteUserByAdmin = () => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => deleteUserApi(data.id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["myDoctors"],
            })
            toast.success("User deleted successfully!");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to delete user!";
            toast.error(message);
        },
    });

    return { deleteUserByAdmin: mutate, isLoading: isPending };
};
