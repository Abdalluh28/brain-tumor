import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    OTHER_XAI_METHODS,
    PRIMARY_XAI_METHOD,
} from "@/services/xaiApi";
import { useRunScanXai } from "./useRunScanXai";

const METHOD_LABELS = {
    gradcam: "Grad-CAM",
    "gradcam++": "Grad-CAM++",
    integrated_gradients: "Integrated Gradients",
    vanilla_saliency: "Vanilla Saliency",
};

export default function ScanIdXai({ scanId, xai, xaiError }) {
    const { runXai, isLoading } = useRunScanXai(scanId);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(
        OTHER_XAI_METHODS.find((m) => m.id !== PRIMARY_XAI_METHOD.id)?.id
            ?? OTHER_XAI_METHODS[0]?.id
            ?? "gradcam",
    );

    if (!xai) {
        return (
            <div className="flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
                <p className="font-semibold text-xl">Explainable AI (XAI)</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    No explainability maps were saved for this scan. That usually
                    means XAI failed during analysis (common for glioma / HGG / LGG
                    cases on stage 3) while classification still completed.
                </p>
                {xaiError && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 break-words">
                        Server note: {xaiError}
                    </p>
                )}
                <Button
                    type="button"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => runXai(PRIMARY_XAI_METHOD.id)}
                >
                    {isLoading ? "Generating…" : `Generate ${PRIMARY_XAI_METHOD.label}`}
                </Button>
            </div>
        );
    }

    const activeMethod = xai.xaiMethod;
    const activeLabel =
        METHOD_LABELS[activeMethod] || activeMethod;
    const isPrimaryMethod = activeMethod === PRIMARY_XAI_METHOD.id;
    const stageLabel = `Stage ${xai.stage} · ${xai.targetClassLabel}`;

    const handleApplyOtherMethod = () => {
        if (selectedMethod === activeMethod) {
            setDialogOpen(false);
            return;
        }
        runXai(selectedMethod, {
            onSuccess: () => setDialogOpen(false),
        });
    };

    return (
        <div className="flex flex-col gap-6 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                    <p className="font-semibold text-xl">Explainable AI (XAI)</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Cascade explanation for{" "}
                        <strong>{xai.cascadePrediction}</strong>
                        {" — "}
                        <strong>{activeLabel}</strong> on {stageLabel}
                        {xai.displayModality && ` (display: ${xai.displayModality})`}
                    </p>
                    {!isPrimaryMethod && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            Showing an alternate XAI method. New scans use{" "}
                            {PRIMARY_XAI_METHOD.label} by default.
                        </p>
                    )}
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            className="shrink-0"
                        >
                            Other XAI methods
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Other XAI methods</DialogTitle>
                            <DialogDescription>
                                Choose an explainability method for this scan&apos;s
                                cascade stage. All methods are supported for stages
                                1, 2, and 3.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-2 py-2">
                            {OTHER_XAI_METHODS.map((method) => (
                                <button
                                    key={method.id}
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => setSelectedMethod(method.id)}
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                                        selectedMethod === method.id
                                            ? "border-primary bg-primary/5"
                                            : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                                    }`}
                                >
                                    <span className="font-medium">
                                        {method.label}
                                    </span>
                                    {activeMethod === method.id && (
                                        <span className="text-xs text-slate-500">
                                            Current
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleApplyOtherMethod}
                                disabled={
                                    isLoading ||
                                    selectedMethod === activeMethod
                                }
                            >
                                {isLoading ? "Applying…" : "Apply method"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Generating explanation…
                </p>
            )}

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
