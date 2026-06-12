import { logoutApi } from "@/services/authApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export function useLogout() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { mutate: logout, isPending } = useMutation({
        mutationFn: () => logoutApi(),
        retry: false,
        onSuccess: (_, variables) => {
            const { reason } = variables || {};

            if (reason === "logout") {
                toast.success("Logout successful");
            }

            queryClient.clear();
            navigate("/login", { replace: true });
        },

        onError: (err) => {
            const message = err?.response?.data?.message || "Logout Failed";
            toast.error(message);
        },
    });

    return { logout, isLoading: isPending };
}
