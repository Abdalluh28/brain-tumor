import { getNotificationsApi } from "@/services/notificationApi";
import { useQuery } from "@tanstack/react-query";

export function useGetNotifications() {
    const { data, isPending } = useQuery({
        queryFn: () => getNotificationsApi(),
        queryKey: ["notifications"],
    });

    return {
        notifications: data ?? [],
        isLoading: isPending,
    };
}
