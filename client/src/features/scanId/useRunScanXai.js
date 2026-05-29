import {
    applyActiveXaiView,
    hasCachedXaiView,
    runScanXaiApi,
} from "@/services/xaiApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

function pickPreviewOverlay(xai) {
    const lastStage = xai?.stages?.[xai.stages.length - 1];
    const channelMaps = lastStage?.channelMaps;
    return (
        channelMaps?.[channelMaps.length - 1]?.overlayPath
        ?? lastStage?.overlayPath
        ?? null
    );
}

function buildScanPatch(scan, xai) {
    const lastOverlay = pickPreviewOverlay(xai);
    return {
        ...scan,
        xai,
        xaiError: null,
        gradCamPath: lastOverlay ?? scan?.gradCamPath,
    };
}

export function useRunScanXai(scanId) {
    const queryClient = useQueryClient();

    const { mutate: runXai, isPending: isLoading } = useMutation({
        mutationFn: async (xaiMethod) => {
            const scan = queryClient.getQueryData(["scan", scanId]);

            if (scan?.xai && hasCachedXaiView(scan.xai, xaiMethod)) {
                const cachedXai = applyActiveXaiView(scan.xai, xaiMethod);
                if (cachedXai) {
                    return {
                        cached: true,
                        xai: cachedXai,
                        scan: buildScanPatch(scan, cachedXai),
                    };
                }
            }

            return runScanXaiApi(scanId, { xaiMethod });
        },
        onMutate: async (xaiMethod) => {
            const scan = queryClient.getQueryData(["scan", scanId]);
            if (!scan?.xai || !hasCachedXaiView(scan.xai, xaiMethod)) {
                return undefined;
            }

            const cachedXai = applyActiveXaiView(scan.xai, xaiMethod);
            if (!cachedXai) {
                return undefined;
            }

            const optimisticScan = buildScanPatch(scan, cachedXai);
            queryClient.setQueryData(["scan", scanId], optimisticScan);

            return { previousScan: scan };
        },
        onError: (err, _method, context) => {
            if (context?.previousScan) {
                queryClient.setQueryData(["scan", scanId], context.previousScan);
            }

            const message =
                err?.response?.data?.message
                || "Could not update the visual explanation";
            toast.error(message);
        },
        onSuccess: (data) => {
            const xai = data.xai ?? data.scan?.xai;
            const scan = buildScanPatch(
                data.scan ?? queryClient.getQueryData(["scan", scanId]) ?? {},
                xai,
            );
            queryClient.setQueryData(["scan", scanId], scan);

            toast.success(
                data.cached
                    ? "Showing saved explanation"
                    : "Visual explanation saved",
            );

            if (data.cached) {
                runScanXaiApi(scanId, { xaiMethod: xai.xaiMethod }).catch(() => {
                    /* UI already switched; persistence is best-effort */
                });
            }
        },
    });

    return { runXai, isLoading };
}
