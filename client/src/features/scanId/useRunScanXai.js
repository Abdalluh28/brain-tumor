import { runScanXaiApi } from "@/services/xaiApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useRunScanXai(scanId) {
    const queryClient = useQueryClient();

    const { mutate: runXai, isPending: isLoading } = useMutation({
        mutationFn: (xaiMethod) => runScanXaiApi(scanId, { xaiMethod }),
        onSuccess: (data) => {
            const xai = data.xai ?? data.scan?.xai;
            const lastStage = xai?.stages?.[xai.stages.length - 1];
            const channelMaps = lastStage?.channelMaps;
            const lastOverlay =
                channelMaps?.[channelMaps.length - 1]?.overlayPath
                ?? lastStage?.overlayPath;
            const scan = {
                ...data.scan,
                xai,
                xaiError: null,
                gradCamPath: lastOverlay ?? data.scan?.gradCamPath,
            };
            queryClient.setQueryData(["scan", scanId], scan);
            toast.success(
                data.cached
                    ? "Switched explanation view"
                    : "Visual explanation updated",
            );
        },
        onError: (err) => {
            const message =
                err?.response?.data?.message || "Could not update the visual explanation";
            toast.error(message);
        },
    });

    return { runXai, isLoading };
}
