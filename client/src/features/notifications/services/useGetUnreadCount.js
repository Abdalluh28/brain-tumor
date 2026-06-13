import { getUnreadCountApi } from "@/services/notificationApi";
import { useQuery } from "@tanstack/react-query";

export function useGetUnreadCount() {
    const { data, isPending } = useQuery({
        queryFn: () => getUnreadCountApi(),
        queryKey: ["unreadCount"],
    });

    return {
        unreadCount: data?.count ?? 0,
        isLoading: isPending,
    };
}
