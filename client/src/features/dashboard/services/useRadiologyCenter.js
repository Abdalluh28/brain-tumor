import { createRadiologyCenterApi } from "@/services/userApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useRadiologyCenter = () => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => createRadiologyCenterApi(data),
        onSuccess: () => {
            toast.success("Radiology center created successfully");
            queryClient.invalidateQueries({
                queryKey: ["user"],
            })
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message ||
                "Failed to create radiology center";
            toast.error(message);
        },
    });

    return { createRadiologyCenter: mutate, isLoading: isPending };
};
