import { getDoctorsApi } from "@/services/userApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useGetMyDoctors() {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const { data, isPending } = useQuery({
        queryFn: () => getDoctorsApi({ page, search, status }),
        queryKey: ["myDoctors", page, search, status],
    });

    const {
        doctors = [],
        currentPage = 1,
        totalPages = 1,
        totalDoctors = 0,
        start = 0,
        end = 0,
    } = data ?? {};

    // prefetch next page on mount
    useEffect(() => {
        if (currentPage < totalPages) {
            queryClient.prefetchQuery({
                queryFn: () =>
                    getDoctorsApi({ page: currentPage + 1, search, status }),
                queryKey: ["myDoctors", currentPage + 1, search, status],
            });
        }
    }, [currentPage, totalPages, search, status, queryClient]);

    return {
        doctors: doctors ?? [],
        currentPage: currentPage ?? 1,
        totalPages: totalPages ?? 1,
        totalDoctors: totalDoctors ?? 0,
        start: start ?? 0,
        end: end ?? 0,
        isLoading: isPending,
    };
}
