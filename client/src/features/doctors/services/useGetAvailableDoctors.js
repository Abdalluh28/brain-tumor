import { getAvailableDoctorsApi } from "@/services/invitationApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useGetAvailableDoctors() {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const search = searchParams.get("search") || "";

    const { data, isPending } = useQuery({
        queryFn: () => getAvailableDoctorsApi({ search, page }),
        queryKey: ["availableDoctors", search, page],
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
                    getAvailableDoctorsApi({ search, page: currentPage + 1 }),
                queryKey: ["availableDoctors", search, currentPage + 1],
            });
        }
    }, [currentPage, totalPages, search, queryClient]);

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
