import { getScansApi } from "@/services/scanApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export const useScans = () => {
    // get the params from url to handle pagination, filters, and search
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const type = searchParams.get("prediction") || "";
    const confidence = searchParams.get("confidence") || "";
    const confidenceFrom = confidence.split("-")[0] || "";
    const confidenceTo = confidence.split("-")[1] || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("start") || "";
    const endDate = searchParams.get("end") || "";
    const search = searchParams.get("search") || "";
    const doctor = searchParams.get("doctor") || "me";

    const { data, isPending: isLoading } = useQuery({
        queryFn: () =>
            getScansApi({
                page,
                type,
                confidenceFrom,
                confidenceTo,
                status,
                startDate,
                endDate,
                search,
                doctor,
            }),
        queryKey: [
            "scans",
            page,
            type,
            confidenceFrom,
            confidenceTo,
            status,
            startDate,
            endDate,
            search,
            doctor,
        ],
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
                queryKey: [
                    "scans",
                    page + 1,
                    type,
                    confidenceFrom,
                    confidenceTo,
                    status,
                    startDate,
                    endDate,
                    search,
                    doctor,
                ],
                queryFn: () =>
                    getScansApi({
                        page: page + 1,
                        type,
                        confidenceFrom,
                        confidenceTo,
                        status,
                        startDate,
                        endDate,
                        search,
                        doctor,
                    }),
            });
        }
    }, [
        queryClient,
        page,
        totalPages,
        type,
        confidenceFrom,
        confidenceTo,
        status,
        startDate,
        endDate,
        search,
        doctor,
    ]);

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
