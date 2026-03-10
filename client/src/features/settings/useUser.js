import { getUserApi } from "@/services/userApi";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
    const { data: user, isError, isPending } = useQuery({
        queryFn: () => getUserApi(),
        queryKey: ["user"]
    })

    return { user: isError ? undefined : user, isLoading: isPending };
}
