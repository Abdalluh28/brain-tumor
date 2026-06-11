import { getMonthlyDistributionApi } from "@/services/dashboardApi";
import { useQuery } from "@tanstack/react-query";

export const useMonthDistribution = () => {
    const { data, isPending, isError } = useQuery({
        queryFn: () => getMonthlyDistributionApi(),
        queryKey: ["monthlyDistribution"],
    });

    return {
        data: isError ? [] : data,
        isLoading: isPending,
    };
};
