import { getCentersApi } from "@/services/centers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export const useGetCenters = () => {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "";
    const admin = searchParams.get("admin") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const { data, isPending } = useQuery({
        queryFn: () => getCentersApi({ search, location, admin, page }),
        queryKey: ["centers", search, location, admin, page],
    });

    const {
        centers = [],
        locations = [],
        admins = [],
        currentPage = 1,
        totalPages = 1,
        totalCenters = 0,
        start = 0,
        end = 0,
    } = data ?? {};

    // prefetch next page on mount
    useEffect(() => {
        if (page < totalPages) {
            queryClient.prefetchQuery({
                queryFn: () =>
                    getCentersApi({ search, location, admin, page: page + 1 }),
                queryKey: ["centers", search, location, admin, page + 1],
            });
        }
    }, [page, totalPages, search, location, admin, queryClient]);

    return {
        centers,
        locations,
        admins,
        currentPage,
        totalPages,
        totalCenters,
        start,
        end,
        isLoading: isPending,
    };
};
