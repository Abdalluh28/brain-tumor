import { runScanXaiApi } from "@/services/xaiApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useRunScanXai(scanId) {
    const queryClient = useQueryClient();

    const { mutate: runXai, isPending: isLoading } = useMutation({
        mutationFn: (xaiMethod) => runScanXaiApi(scanId, { xaiMethod }),
        onSuccess: (data) => {
            const xai = data.xai ?? data.scan?.xai;
            const lastOverlay = xai?.stages?.[xai.stages.length - 1]?.overlayPath;
            const scan = {
                ...data.scan,
                xai,
                xaiError: null,
                gradCamPath: lastOverlay ?? data.scan?.gradCamPath,
            };
            queryClient.setQueryData(["scan", scanId], scan);
            const count = xai?.stages?.length ?? 0;
            toast.success(
                `XAI updated (${xai?.xaiMethod || "gradcam++"}, ${count} stage${count === 1 ? "" : "s"})`,
            );
        },
        onError: (err) => {
            const message =
                err?.response?.data?.message || "XAI explanation failed";
            toast.error(message);
        },
    });

    return { runXai, isLoading };
}
