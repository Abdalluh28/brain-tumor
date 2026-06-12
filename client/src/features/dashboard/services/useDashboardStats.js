import { getStatsApi } from "@/services/dashboardApi";
import { useQuery } from "@tanstack/react-query";

export const useDashboardStats = () => {
    const { data, isPending, isError } = useQuery({
        queryFn: () => getStatsApi(),
        queryKey: ["dashboardStats"],
    });

    return {
        stats: isError ? null : data,
        isLoading: isPending,
        isError,
    };
};
