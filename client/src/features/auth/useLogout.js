import { useMutation } from "@tanstack/react-query";

export function useLogout() {
    const { mutate: logout, isPending } = useMutation({
        
    });

    return { logout, isLoading: isPending };
}
