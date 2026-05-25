import { runScanXaiApi } from "@/services/xaiApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useRunScanXai(scanId) {
    const queryClient = useQueryClient();

    const { mutate: runXai, isPending: isLoading } = useMutation({
        mutationFn: (xaiMethod) => runScanXaiApi(scanId, { xaiMethod }),
        onSuccess: (data) => {
            queryClient.setQueryData(["scan", scanId], data.scan);
            toast.success(`XAI updated (${data.xai?.xaiMethod || "gradcam"})`);
        },
        onError: (err) => {
            const message =
                err?.response?.data?.message || "XAI explanation failed";
            toast.error(message);
        },
    });

    return { runXai, isLoading };
}
