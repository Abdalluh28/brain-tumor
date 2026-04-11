import { getRecentScansApi } from "@/services/dashboardApi";
import { useQuery } from "@tanstack/react-query";

export const useRecentScans = () => {
    const { data, isPending, isError } = useQuery({
        queryFn: () => getRecentScansApi(),
        queryKey: ["recentScans"],
    });

    return {
        data: isError ? [] : data,
        isLoading: isPending,
    };
};
