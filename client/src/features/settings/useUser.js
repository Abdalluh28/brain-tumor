import { getUser } from "@/services/userApi";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
    const {
        data: user,
        isPending,
        isError,
    } = useQuery({
        queryFn: () => getUser(),
        queryKey: ["user"],
        retry: false,
    });

    return { user: isError ? undefined : user, isLoading: isPending };
}
