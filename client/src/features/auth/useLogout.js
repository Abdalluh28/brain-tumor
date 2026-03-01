import { logoutApi } from "@/services/authApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useLogout() {
    const queryClient = useQueryClient();

    const { mutate: logout, isPending } = useMutation({
        mutationFn: (data) => logoutApi(data),
        retry: false,
        onSuccess: () => {
            toast.success("Logout successful");
            queryClient.invalidateQueries({
                queryKey: ["user"],
            });
        },

        onError: (err) => {
            const message = err?.response?.data?.message || "Logout Failed";
            toast.error(message);
        },
    });

    return { logout, isLoading: isPending };
}
