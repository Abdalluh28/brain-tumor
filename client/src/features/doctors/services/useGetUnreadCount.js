import { getUnreadCountApi } from "@/services/notificationApi";
import { useQuery } from "@tanstack/react-query";

export function useGetAvailableDoctors() {
    const { data, isPending } = useQuery({
        queryFn: () => getUnreadCountApi(),
        queryKey: ["availableDoctors"],
    });

    return {
        notifications: data ?? [],
        isLoading: isPending,
    };
}
