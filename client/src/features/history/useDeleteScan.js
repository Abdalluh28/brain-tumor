import { deleteScanApi } from "@/services/scanApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useDeleteScan = () => {
    const queryClient = useQueryClient();

    const { mutate: deleteScan, isPending } = useMutation({
        mutationFn: (id) => deleteScanApi(id),
        onSuccess: () => {
            toast.success("Scan deleted successfully!");
            queryClient.invalidateQueries({
                queryKey: ["scans"],
            });
        },
        onError: (err) => {
            const message =
                err?.response?.data?.message || "Scan deletion failed!";
            toast.error(message);
        },
    });

    return { deleteScan, isLoading: isPending };
};
