import { deleteUserApi } from "@/services/userApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useLogout } from "../auth/useLogout";
import { useUser } from "./useUser";

export const useDeleteUser = () => {
    const { logout } = useLogout();
    const { user } = useUser();

    const { mutate, isPending } = useMutation({
        mutationFn: () => deleteUserApi(user?.id),
        onSuccess: () => {
            toast.success("User deleted successfully!");
            logout();
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to delete user!";
            toast.error(message);
        },
    });

    return { deleteUser: mutate, isLoading: isPending };
};
