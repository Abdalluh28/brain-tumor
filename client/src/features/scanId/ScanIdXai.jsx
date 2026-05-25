import { Button } from "@/components/ui/button";
import { XAI_METHODS } from "@/services/xaiApi";
import { useRunScanXai } from "./useRunScanXai";

const METHOD_LABELS = {
    gradcam: "Grad-CAM",
    "gradcam++": "Grad-CAM++",
    integrated_gradients: "Integrated Gradients",
    vanilla_saliency: "Vanilla Saliency",
};

export default function ScanIdXai({ scanId, xai }) {
    const { runXai, isLoading } = useRunScanXai(scanId);

    if (!xai) {
        return (
            <div className="flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
                <p className="font-semibold text-xl">Explainable AI (XAI)</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    No XAI explanation is stored for this scan yet.
                </p>
            </div>
        );
    }

    const activeMethod = xai.xaiMethod;
    const stageLabel = `Stage ${xai.stage} · ${xai.targetClassLabel}`;

    return (
        <div className="flex flex-col gap-6 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
            <div className="flex flex-col gap-2">
                <p className="font-semibold text-xl">Explainable AI (XAI)</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Cascade explanation for <strong>{xai.cascadePrediction}</strong>
                    {" — "}
                    {METHOD_LABELS[activeMethod] || activeMethod} on {stageLabel}
                    {xai.displayModality && ` (display: ${xai.displayModality})`}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {XAI_METHODS.map((method) => (
                    <Button
                        key={method.id}
                        type="button"
                        variant={activeMethod === method.id ? "default" : "outline"}
                        size="sm"
                        disabled={isLoading}
                        onClick={() => {
                            if (method.id !== activeMethod) {
                                runXai(method.id);
                            }
                        }}
                    >
                        {method.label}
                    </Button>
                ))}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
                Switching method re-runs XAI only (no new segmentation).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ImagePanel title="Original (display channel)" src={xai.originalPath} />
                <ImagePanel title="Heatmap" src={xai.heatmapPath} />
                <ImagePanel title="Overlay" src={xai.overlayPath} />
            </div>

            {xai.metadata?.targetLayer && (
                <p className="text-xs text-slate-500">
                    Target layer: <code>{xai.metadata.targetLayer}</code>
                </p>
            )}
        </div>
    );
}

function ImagePanel({ title, src }) {
    if (!src) return null;

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-3">
            <p className="text-sm font-medium">{title}</p>
            <div className="flex justify-center items-center min-h-[180px] bg-slate-50 dark:bg-slate-900/40 rounded-md">
                <img
                    src={src}
                    alt={title}
                    className="max-h-56 w-full object-contain rounded-md"
                />
            </div>
        </div>
    );
}
