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

const STAGE_TITLES = {
    1: "Stage 1 — Healthy vs Tumor",
    2: "Stage 2 — GLI / Mets / Other",
    3: "Stage 3 — HGG vs LGG",
};

/** Normalize legacy single-stage xai documents. */
function normalizeXaiStages(xai) {
    if (!xai) return [];
    if (Array.isArray(xai.stages) && xai.stages.length > 0) {
        return xai.stages;
    }
    if (xai.stage != null && xai.overlayPath) {
        return [xai];
    }
    return [];
}

export default function ScanIdXai({ scanId, xai, xaiError }) {
    const { runXai, isLoading } = useRunScanXai(scanId);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(
        OTHER_XAI_METHODS.find((m) => m.id !== PRIMARY_XAI_METHOD.id)?.id
            ?? OTHER_XAI_METHODS[0]?.id
            ?? "gradcam",
    );

    const stages = normalizeXaiStages(xai);

    if (stages.length === 0) {
        return (
            <div className="flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
                <p className="font-semibold text-xl">Explainable AI (XAI)</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    No explainability maps were saved for this scan. That usually
                    means XAI failed during analysis while classification still
                    completed.
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
    const activeLabel = METHOD_LABELS[activeMethod] || activeMethod;
    const isPrimaryMethod = activeMethod === PRIMARY_XAI_METHOD.id;
    const cascadePrediction = xai.cascadePrediction;

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
                        Cascade path for{" "}
                        <strong>{cascadePrediction}</strong>
                        {" — "}
                        <strong>{activeLabel}</strong>
                        {" · "}
                        {stages.length} heatmap
                        {stages.length === 1 ? "" : "s"}
                        {" "}
                        (stages {stages.map((s) => s.stage).join(", ")})
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
                                Re-run explainability for all cascade stages on
                                this scan (1–3 heatmaps depending on prediction).
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
                    Generating explanations…
                </p>
            )}

            <div className="flex flex-col gap-10">
                {stages.map((stageResult) => (
                    <StageXaiSection
                        key={stageResult.stage}
                        stageResult={stageResult}
                    />
                ))}
            </div>
        </div>
    );
}

function StageXaiSection({ stageResult }) {
    const title =
        STAGE_TITLES[stageResult.stage]
        ?? `Stage ${stageResult.stage}`;
    const subtitle = `${stageResult.targetClassLabel}${
        stageResult.displayModality
            ? ` · display ${stageResult.displayModality}`
            : ""
    }`;

    return (
        <section className="flex flex-col gap-4 border-t border-slate-200 dark:border-slate-700 pt-6 first:border-t-0 first:pt-0">
            <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Explaining class: <strong>{subtitle}</strong>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ImagePanel
                    title="Original (display channel)"
                    src={stageResult.originalPath}
                />
                <ImagePanel title="Heatmap" src={stageResult.heatmapPath} />
                <ImagePanel title="Overlay" src={stageResult.overlayPath} />
            </div>

            {stageResult.metadata?.targetLayer && (
                <p className="text-xs text-slate-500">
                    Target layer:{" "}
                    <code>{stageResult.metadata.targetLayer}</code>
                </p>
            )}
        </section>
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
