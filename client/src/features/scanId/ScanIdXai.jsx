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
    GRAD_XAI_METHODS,
    isPermutationMethod,
    PERMUTATION_XAI_METHODS,
    PRIMARY_XAI_METHOD,
} from "@/services/xaiApi";
import { useRunScanXai } from "./useRunScanXai";

const METHOD_LABELS = {
    gradcam: "Grad-CAM",
    "gradcam++": "Grad-CAM++",
    integrated_gradients: "Integrated Gradients",
    vanilla_saliency: "Vanilla Saliency",
    pci: "PCI grid (per-channel)",
    pci_full_channel: "PCI full-channel (per-channel)",
    occlusion: "Occlusion (per-channel)",
    shap: "SHAP (per-channel)",
};

const STAGE_TITLES = {
    1: "Stage 1 — Healthy vs Tumor",
    2: "Stage 2 — GLI / Mets / Other",
    3: "Stage 3 — HGG vs LGG",
};

const MODALITY_LABELS = {
    t1n: "T1n",
    t1c: "T1c",
    t2w: "T2w",
    t2f: "FLAIR",
};

/** Normalize legacy single-stage xai documents. */
function normalizeXaiStages(xai) {
    if (!xai) return [];
    if (Array.isArray(xai.stages) && xai.stages.length > 0) {
        return xai.stages;
    }
    if (xai.stage != null && (xai.overlayPath || xai.channelMaps)) {
        return [xai];
    }
    return [];
}

export default function ScanIdXai({ scanId, xai, xaiError }) {
    const { runXai, isLoading } = useRunScanXai(scanId);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState("gradcam");

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
    const isPermutation = isPermutationMethod(activeMethod);
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
                        Final prediction{" "}
                        <strong>{cascadePrediction}</strong>
                        {" — "}
                        <strong>{activeLabel}</strong>
                        {" · "}
                        Stage 2 (EfficientNet GLI / METS / OTHER)
                        {isPermutation
                            ? " · per-modality heatmaps"
                            : " · combined heatmap"}
                    </p>
                    {!isPrimaryMethod && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            Showing an alternate XAI method. New scans use{" "}
                            {PRIMARY_XAI_METHOD.label} by default.
                        </p>
                    )}
                    {isPermutation && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            PCI, occlusion, SHAP, and related methods show one
                            overlay per MRI
                            channel so you can see which modality drove the
                            decision. Grad-CAM methods use a single combined map.
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
                    <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Other XAI methods</DialogTitle>
                            <DialogDescription>
                                Re-run stage-2 explainability on this scan.
                                Permutation methods (PCI, occlusion, SHAP) may
                                take longer.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-4 py-2">
                            <MethodGroup
                                title="Gradient methods"
                                description="One combined heatmap (stage 2)"
                                methods={GRAD_XAI_METHODS}
                                selectedMethod={selectedMethod}
                                activeMethod={activeMethod}
                                isLoading={isLoading}
                                onSelect={setSelectedMethod}
                            />
                            <MethodGroup
                                title="Permutation / attribution"
                                description="One heatmap per MRI channel"
                                methods={PERMUTATION_XAI_METHODS}
                                selectedMethod={selectedMethod}
                                activeMethod={activeMethod}
                                isLoading={isLoading}
                                onSelect={setSelectedMethod}
                            />
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
                        isPermutation={isPermutation}
                        xaiMethod={activeMethod}
                    />
                ))}
            </div>
        </div>
    );
}

function MethodGroup({
    title,
    description,
    methods,
    selectedMethod,
    activeMethod,
    isLoading,
    onSelect,
}) {
    return (
        <div className="flex flex-col gap-2">
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
            {methods.map((method) => (
                <button
                    key={method.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => onSelect(method.id)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        selectedMethod === method.id
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    }`}
                >
                    <span className="font-medium">{method.label}</span>
                    {activeMethod === method.id && (
                        <span className="text-xs text-slate-500">Current</span>
                    )}
                </button>
            ))}
        </div>
    );
}

function formatImportanceValue(value, metadata, modality) {
    const percentMap = metadata?.permutationImportancePercent;
    if (percentMap && modality in percentMap) {
        const pct = Number(percentMap[modality]);
        const decimals = pct > 0 && pct < 1 ? 2 : 1;
        return `${pct.toFixed(decimals)}%`;
    }
    if (value != null && value <= 1.01) {
        return `${(Number(value) * 100).toFixed(1)}%`;
    }
    return Number(value ?? 0).toFixed(4);
}

function StageXaiSection({ stageResult, isPermutation, xaiMethod }) {
    const title =
        STAGE_TITLES[stageResult.stage]
        ?? `Stage ${stageResult.stage}`;
    const subtitle = stageResult.targetClassLabel;

    const channelMaps = stageResult.channelMaps ?? [];
    const hasChannelMaps = channelMaps.length > 0;

    if (hasChannelMaps) {
        const importances =
            stageResult.metadata?.permutationImportancePercent
            ?? stageResult.metadata?.permutationImportance;

        return (
            <section className="flex flex-col gap-4 border-t border-slate-200 dark:border-slate-700 pt-6 first:border-t-0 first:pt-0">
                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Explaining class: <strong>{subtitle}</strong>
                        {" — "}
                        one heatmap per input channel
                        {isPermutation && (
                            <> — importance shown as % of total channel effect</>
                        )}
                    </p>
                </div>

                {importances && (
                    <div className="flex flex-wrap gap-3 text-xs">
                        {Object.entries(importances).map(([modality, value]) => (
                            <span
                                key={modality}
                                className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1"
                            >
                                {MODALITY_LABELS[modality] ?? modality}:{" "}
                                <strong>
                                    {formatImportanceValue(
                                        value,
                                        stageResult.metadata,
                                        modality,
                                    )}
                                </strong>
                            </span>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {channelMaps.map((channel) => (
                        <ChannelMapPanel
                            key={channel.modality}
                            channel={channel}
                            xaiMethod={xaiMethod}
                            metadata={stageResult.metadata}
                        />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="flex flex-col gap-4 border-t border-slate-200 dark:border-slate-700 pt-6 first:border-t-0 first:pt-0">
            <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Explaining class: <strong>{subtitle}</strong>
                    {stageResult.displayModality && (
                        <>
                            {" · "}
                            display {stageResult.displayModality}
                        </>
                    )}
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

function ChannelMapPanel({ channel, xaiMethod, metadata }) {
    const label = MODALITY_LABELS[channel.modality] ?? channel.modality;

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{label}</p>
                <span className="text-xs text-slate-500">
                    importance{" "}
                    <strong>
                        {formatImportanceValue(
                            channel.channelImportance,
                            metadata,
                            channel.modality,
                        )}
                    </strong>
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ImagePanel title="Original" src={channel.originalPath} compact />
                <ImagePanel title="Heatmap" src={channel.heatmapPath} compact />
                <ImagePanel title="Overlay" src={channel.overlayPath} compact />
            </div>
        </div>
    );
}

function ImagePanel({ title, src, compact = false }) {
    if (!src) return null;

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-3">
            <p className="text-sm font-medium">{title}</p>
            <div
                className={`flex justify-center items-center bg-slate-50 dark:bg-slate-900/40 rounded-md ${
                    compact ? "min-h-[120px]" : "min-h-[180px]"
                }`}
            >
                <img
                    key={src}
                    src={src}
                    alt={title}
                    className={`w-full object-contain rounded-md ${
                        compact ? "max-h-36" : "max-h-56"
                    }`}
                />
            </div>
        </div>
    );
}
