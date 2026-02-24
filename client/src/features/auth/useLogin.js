import { loginApi } from "@/services/authApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useLogin() {
    
    // query client to invalidate cache
    const queryClient = useQueryClient();

    const { mutate: login, isPending } = useMutation({
        // api call
        mutationFn: (data) => loginApi(data),
        
        // toast success message and invalidate cache
        onSuccess: () => {
            toast.success("Login successful");
            queryClient.invalidateQueries({
                queryKey: ["user"],
            });
        },

        // toast error message
        onError: (err) => {
            const message = err?.response?.data?.message || "Login Failed";
            toast.error(message);
        },
    });

    return { login, isLoading: isPending };
}
