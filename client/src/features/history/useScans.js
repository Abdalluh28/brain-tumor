import { getScansApi } from "@/services/scanApi";
import { useQuery } from "@tanstack/react-query";

export const useScans = () => {
    const { data, isPending: isLoading } = useQuery({
        queryFn: () => getScansApi(),
        queryKey: ["scans"],
        retry: false,
    });

    const {
        scans = [],
        currentPage = 1,
        totalPages = 1,
        totalScans = 0,
        start = 0,
        end = 0,
    } = data ?? {};

    return {
        scans,
        currentPage,
        totalPages,
        totalScans,
        start,
        end,
        isLoading,
    };
};
