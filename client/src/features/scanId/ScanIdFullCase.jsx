import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

const CASE_LABELS = {
    GLI: 'Glioma (GLI)',
    METS: 'Metastasis (METS)',
    OTHER: 'Other tumor (OTHER)',
    Healthy: 'Healthy (no tumor)',
};

const MODALITY_LABELS = {
    t1n: 'T1n',
    t1c: 'T1c',
    t2w: 'T2w',
    t2f: 'FLAIR',
};

export default function ScanIdFullCase({ fullCase }) {
    const [validExpanded, setValidExpanded] = useState(false);
    const [tumorExpanded, setTumorExpanded] = useState(true);

    if (!fullCase) {
        return null;
    }

    const {
        casePrediction,
        averageConfidencePercent,
        averageConfidence,
        numValidSlices,
        numTumorSlices,
        validSlicePreviews = [],
        maskMetadata,
        tumorSlices = [],
    } = fullCase;

    const maskNiftiPath = maskMetadata?.maskNiftiPath;

    const confidenceDisplay =
        averageConfidencePercent ??
        (averageConfidence != null ? Math.round(averageConfidence * 10000) / 100 : null);

    const caseLabel = CASE_LABELS[casePrediction] ?? casePrediction;

    return (
        <>
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                    <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            Full-case 3D analysis
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Majority vote across {numValidSlices ?? '—'} valid T1c slices
                            (brain area ≥ 8,000 px, largest component ≥ 2,000 px).
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Stat label="Case prediction" value={caseLabel} highlight />
                    <Stat
                        label="Average confidence"
                        value={confidenceDisplay != null ? `${confidenceDisplay} %` : '—'}
                    />
                    <Stat label="Tumor slices" value={String(numTumorSlices ?? tumorSlices.length)} />
                </div>
            </div>

            {maskNiftiPath ? (
                <div className="px-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <a
                        href={maskNiftiPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Download 3D segmentation mask (NIfTI)
                    </a>
                </div>
            ) : null}

            {validSlicePreviews.length > 0 ? (
                <>
                    <button
                        type="button"
                        onClick={() => setValidExpanded((v) => !v)}
                        className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                        <span>
                            Valid slices — all modalities ({validSlicePreviews.length})
                        </span>
                        {validExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {validExpanded ? (
                        <div className="px-6 py-4 flex flex-col gap-6 max-h-[70vh] overflow-y-auto border-b border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Exported from NIfTI before classification. Slice numbers match the MRI viewer (e.g. slice 83 / 155).
                            </p>
                            {validSlicePreviews.map((row) => (
                                <ValidSliceRow key={row.z ?? row.sliceNumber} row={row} />
                            ))}
                        </div>
                    ) : null}
                </>
            ) : null}

            {tumorSlices.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-slate-500 dark:text-slate-400">
                    No tumor-containing slices to display for this case.
                </p>
            ) : null}
        </section>

            {tumorSlices.length > 0 ? (
                <>
                    <TumorSlicesXaiSection
                        tumorSlices={tumorSlices}
                        expanded={tumorExpanded}
                        onToggle={() => setTumorExpanded((v) => !v)}
                    />
                    <TumorSlicesSegmentationSection tumorSlices={tumorSlices} />
                </>
            ) : null}
        </>
    );
}

function Stat({ label, value, highlight = false }) {
    return (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p
                className={`mt-1 text-base font-semibold ${
                    highlight ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'
                }`}
            >
                {value}
            </p>
        </div>
    );
}

function ValidSliceRow({ row }) {
    const z = row.z ?? row.sliceNumber;
    const modalities = row.modalities || {};

    return (
        <article className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Slice {z}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(modalities).map(([mod, src]) => (
                    <SliceImage
                        key={mod}
                        label={MODALITY_LABELS[mod] ?? mod}
                        src={src}
                    />
                ))}
            </div>
        </article>
    );
}

function TumorSliceHeader({ slice }) {
    const z = slice.z ?? slice.sliceNumber;

    return (
        <header className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Slice z = {z}
            </span>
            {slice.confidence != null ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    Confidence: {slice.confidence} %
                </span>
            ) : null}
        </header>
    );
}

function TumorSlicesXaiSection({ tumorSlices, expanded, onToggle }) {
    return (
        <section className="flex flex-col gap-6 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <p className="font-semibold text-xl">Original MRI &amp; Visual explanation</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        T1n reference slices with Grad-CAM++ overlays on tumor-containing
                        slices ({tumorSlices.length}).
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onToggle}
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                    <span>{expanded ? 'Hide slices' : 'Show slices'}</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {expanded ? (
                <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
                    {tumorSlices.map((slice) => {
                        const z = slice.z ?? slice.sliceNumber;
                        const heatmapSrc =
                            slice.xaiHeatmap && slice.xaiHeatmap !== slice.xai
                                ? slice.xaiHeatmap
                                : null;

                        return (
                            <article
                                key={z}
                                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-4"
                            >
                                <TumorSliceHeader slice={slice} />
                                <div
                                    className={`grid grid-cols-1 gap-4 ${
                                        heatmapSrc ? 'md:grid-cols-3' : 'md:grid-cols-2'
                                    }`}
                                >
                                    <ImagePanel title="MRI reference" src={slice.originalSlice || slice.xaiOriginal} />
                                    {heatmapSrc ? (
                                        <ImagePanel title="Heatmap" src={heatmapSrc} />
                                    ) : null}
                                    <ImagePanel title="Overlay" src={slice.xai} />
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : null}
        </section>
    );
}

function TumorSlicesSegmentationSection({ tumorSlices }) {
    return (
        <section className="flex flex-col gap-6 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
            <div className="flex flex-col gap-1">
                <p className="font-semibold text-xl">Tumor Segmentation</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Segmentation overlays on T1n for each tumor-containing slice
                </p>
            </div>

            <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
                {tumorSlices.map((slice) => {
                    const z = slice.z ?? slice.sliceNumber;

                    return (
                        <article
                            key={z}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-4"
                        >
                            <TumorSliceHeader slice={slice} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SegmentationPanel
                                    title="Overlay on T1"
                                    src={slice.segmentation}
                                    alt={`Segmentation overlay for slice ${z}`}
                                />
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

function ImagePanel({ title, src }) {
    if (!src) {
        return (
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-3">
                <p className="text-sm font-medium">{title}</p>
                <div className="flex justify-center items-center min-h-[180px] bg-slate-50 dark:bg-slate-900/40 rounded-md">
                    <span className="text-xs text-slate-400">N/A</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-3">
            <p className="text-sm font-medium">{title}</p>
            <div className="flex justify-center items-center bg-slate-50 dark:bg-slate-900/40 rounded-md min-h-[180px]">
                <img
                    src={src}
                    alt={title}
                    className="w-full object-contain rounded-md max-h-56"
                    loading="lazy"
                />
            </div>
        </div>
    );
}

function SegmentationPanel({ title, src, alt }) {
    if (!src) {
        return (
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
                <div className="flex justify-center items-center min-h-[200px] bg-black/5 dark:bg-black/20 rounded-md">
                    <span className="text-xs text-slate-400">N/A</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-3 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
            <div className="flex justify-center items-center min-h-[200px] bg-black/5 dark:bg-black/20 rounded-md">
                <img
                    src={src}
                    alt={alt}
                    className="max-h-64 w-full object-contain rounded-md"
                    loading="lazy"
                />
            </div>
        </div>
    );
}

function SliceImage({ label, src }) {
    if (!src) {
        return (
            <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <div className="aspect-square rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                    N/A
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <img
                src={src}
                alt={label}
                className="w-full aspect-square object-contain rounded-md bg-black/5 dark:bg-black/30"
                loading="lazy"
            />
        </div>
    );
}
