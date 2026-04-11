import { getClassDistributionApi } from "@/services/dashboardApi";
import { useQuery } from "@tanstack/react-query";

export const useClassDistribution = () => {
    const { data, isPending, isError } = useQuery({
        queryFn: () => getClassDistributionApi(),
        queryKey: ["classDistribution"],
    });

    return {
        data: isError ? null : data,
        isLoading: isPending,
    };
};
