import { getScanApi } from "@/services/scanApi";
import { useQuery } from "@tanstack/react-query";

export const useScan = ({ id }) => {
    const { data, isError, isPending } = useQuery({
        queryFn: () => getScanApi(id),
        queryKey: ["scan", id],
    });

    return { scan: isError ? undefined : data, isLoading: isPending };
};
