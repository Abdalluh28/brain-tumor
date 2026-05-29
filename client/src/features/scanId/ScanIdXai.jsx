import { Button } from "@/components/ui/button";
import {
    ALTERNATE_XAI_METHOD,
    hasCachedXaiView,
    isPermutationMethod,
    methodIdForViewOption,
    PRIMARY_XAI_METHOD,
    viewOptionForMethod,
    XAI_VIEW_OPTIONS,
} from "@/services/xaiApi";
import { useRunScanXai } from "./useRunScanXai";

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

    const stages = normalizeXaiStages(xai);

    if (stages.length === 0) {
        return (
            <div className="flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
                <p className="font-semibold text-xl">Visual explanation</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    No explanation images were saved for this scan. You can
                    generate them below.
                </p>
                {xaiError && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        The explanation could not be created automatically. Try
                        generating it again.
                    </p>
                )}
                <Button
                    type="button"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => runXai(PRIMARY_XAI_METHOD.id)}
                >
                    {isLoading ? "Generating…" : "Generate explanation"}
                </Button>
            </div>
        );
    }

    const activeMethod = xai.xaiMethod;
    const activeView = viewOptionForMethod(activeMethod);
    const isPerModality = isPermutationMethod(activeMethod);
    const cascadePrediction = xai.cascadePrediction;

    const handleViewChange = (viewId) => {
        if (viewId === activeView || isLoading) {
            return;
        }
        runXai(methodIdForViewOption(viewId));
    };

    return (
        <div className="flex flex-col gap-6 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <p className="font-semibold text-xl">Visual explanation</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Regions associated with the{" "}
                        <strong>{cascadePrediction}</strong> classification.
                        {isPerModality
                            ? " One overlay per MRI sequence."
                            : " Combined overlay across all sequences."}
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div
                        className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 p-1 bg-slate-50 dark:bg-slate-900/40"
                        role="group"
                        aria-label="Explanation view"
                    >
                        {XAI_VIEW_OPTIONS.map((option) => {
                            const isActive = activeView === option.id;
                            const isSaved = hasCachedXaiView(
                                xai,
                                methodIdForViewOption(option.id),
                            );

                            return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleViewChange(option.id)}
                                title={
                                    isSaved
                                        ? "Saved — switches instantly"
                                        : "Will be generated on first use"
                                }
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-white dark:bg-background text-primary shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                            >
                                {option.label}
                                {isSaved && !isActive && (
                                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-400">
                                        saved
                                    </span>
                                )}
                            </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {isLoading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Updating explanation…
                </p>
            )}

            <div className="flex flex-col gap-10">
                {stages.map((stageResult) => (
                    <StageXaiSection
                        key={stageResult.stage}
                        stageResult={stageResult}
                        isPerModality={isPerModality}
                    />
                ))}
            </div>
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

function StageXaiSection({ stageResult, isPerModality }) {
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
                    <h3 className="text-lg font-semibold">By MRI sequence</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        How much each sequence contributed to the{" "}
                        <strong>{subtitle}</strong> result.
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
                <h3 className="text-lg font-semibold">Classification focus</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Areas that most influenced the{" "}
                    <strong>{subtitle}</strong> prediction.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ImagePanel title="MRI reference" src={stageResult.originalPath} />
                <ImagePanel title="Heatmap" src={stageResult.heatmapPath} />
                <ImagePanel title="Overlay" src={stageResult.overlayPath} />
            </div>
        </section>
    );
}

function ChannelMapPanel({ channel, metadata }) {
    const label = MODALITY_LABELS[channel.modality] ?? channel.modality;

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{label}</p>
                <span className="text-xs text-slate-500">
                    contribution{" "}
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
                <ImagePanel title="MRI" src={channel.originalPath} compact />
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
