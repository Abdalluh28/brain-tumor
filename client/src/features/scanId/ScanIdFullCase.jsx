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
    const [tumorExpanded, setTumorExpanded] = useState(false);

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

            {tumorSlices.length > 0 ? (
                <>
                    <button
                        type="button"
                        onClick={() => setTumorExpanded((v) => !v)}
                        className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                        <span>Tumor-containing slices ({tumorSlices.length})</span>
                        {tumorExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {tumorExpanded ? (
                        <div className="px-6 pb-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
                            {tumorSlices.map((slice) => (
                                <TumorSliceCard key={slice.z ?? slice.sliceNumber} slice={slice} />
                            ))}
                        </div>
                    ) : null}
                </>
            ) : (
                <p className="px-6 pb-6 text-sm text-slate-500 dark:text-slate-400">
                    No tumor-containing slices to display for this case.
                </p>
            )}
        </section>
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

function TumorSliceCard({ slice }) {
    const z = slice.z ?? slice.sliceNumber;

    return (
        <article className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <header className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Slice z = {z}
                </span>
                {slice.confidence != null ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Confidence: {slice.confidence} %
                    </span>
                ) : null}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SliceImage label="Original (T1n)" src={slice.originalSlice} />
                <SliceImage label="Segmentation" src={slice.segmentation} />
                <SliceImage label="XAI (Grad-CAM++)" src={slice.xai} />
            </div>
        </article>
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
