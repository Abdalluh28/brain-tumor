import { updateUserByAdminApi } from "@/services/userApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useEditUserByAdmin() {

    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => updateUserByAdminApi(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["myDoctors"],
            })
            toast.success("User updated successfully!");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to update user!";
            toast.error(message);
        },
    });

    return { editUserByAdmin: mutate, isLoading: isPending };
}
