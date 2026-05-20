import { createScanApi } from "@/services/scanApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export function useCreateScan() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { mutate: createScan, isPending: isLoading } = useMutation({
        mutationFn: (data) => createScanApi(data),
        retry: false,
        onSuccess: (data) => {
            toast.success("Scan created successfully!");
            queryClient.invalidateQueries({
                queryKey: ["scans"],
            });
            navigate(`/scan/${data.scan._id}`, { replace: true });
        },
        onError: (err) => {
            const message =
                err?.response?.data?.message || "Scan creation failed!";
            toast.error(message);
        },
    });

    return { createScan, isLoading };
}
