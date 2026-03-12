import { getScansApi } from "@/services/scanApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export const useScans = () => {
    // get page from url to handle pagination
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);


    const { data, isPending: isLoading } = useQuery({
        queryFn: () => getScansApi({ page }),
        queryKey: ["scans", page],
        retry: false,
        // placeholder data to display previous data while loading new data
        placeholderData: (prev) => prev,
    });

    const {
        scans = [],
        currentPage = 1,
        totalPages = 1,
        totalScans = 0,
        start = 0,
        end = 0,
    } = data ?? {};

    // handle pagination, prefetch the next page
    // could also implement prefetching for the previous page, but not necessary
    useEffect(() => {
        if (page < totalPages) {
            queryClient.prefetchQuery({
                queryKey: ["scans", page + 1],
                queryFn: () => getScansApi({ page: page + 1 }),
            });
        }
    }, [queryClient, page, totalPages]);

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
