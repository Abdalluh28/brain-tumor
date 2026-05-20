import { createScanApi } from "@/services/scanApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useCreateScan() {
    const { mutate: createScan, isPending: isLoading } = useMutation({
        mutationFn: (data) => createScanApi(data),
        retry: false,
        onSuccess: () => {
            toast.success("Scan created successfully!");
        },
        onError: (err) => {
            const message =
                err?.response?.data?.message || "Scan creation failed!";
            toast.error(message);
        },
    });

    return { createScan, isLoading };
}
