import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { PREDICTION_CONFIG } from '@/config/predictionConfig';
import SegmentationStatsTable from './SegmentationStatsTable';
import { getFullCaseTumorSliceRows } from './report/reportUtils';

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

const MODALITY_ORDER = ['t1n', 't1c', 't2w', 't2f'];

const PREDICTION_DISPLAY = {
    Healthy: 'Healthy',
    HGG: 'HGG',
    LGG: 'LGG',
    Metastasis: 'Metastasis',
    Others: 'Others',
};

export default function ScanIdFullCase({ fullCase, caseConfidence }) {
    const sliceRows = useMemo(
        () => getFullCaseTumorSliceRows(fullCase),
        [fullCase],
    );

    if (!fullCase) {
        return null;
    }

    const {
        casePrediction,
        numValidSlices,
        numTumorSlices,
        maskMetadata,
    } = fullCase;

    const maskNiftiPath = maskMetadata?.maskNiftiPath;
    const volumeClassStats = maskMetadata?.classStats ?? [];
    const volumeTumorPercentage = maskMetadata?.tumorPercentage;
    const volumeTumorPixels = maskMetadata?.tumorPixels;

    const caseLabel = CASE_LABELS[casePrediction] ?? casePrediction;

    return (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                    <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            3D slice analysis
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Slices with segmented tumor pixels only. Each row shows all MRI
                            sequences, Grad-CAM++ on T1c, and segmentation on T1c. Case
                            result from majority vote across {numValidSlices ?? '—'} valid
                            slices.
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Stat label="Case prediction" value={caseLabel} highlight />
                    <Stat
                        label="Confidence"
                        value={caseConfidence != null ? `${caseConfidence} %` : '—'}
                    />
                    <Stat
                        label="Slices shown"
                        value={String(sliceRows.length || numTumorSlices || '—')}
                    />
                </div>
            </div>

            {maskNiftiPath ? (
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800">
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

            {sliceRows.length === 0 ? (
                <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">
                    No tumor-containing slices to display for this case.
                </p>
            ) : (
                <div className="px-6 py-4 flex flex-col gap-8 max-h-[80vh] overflow-y-auto">
                    {sliceRows.map((slice) => (
                        <SliceAnalysisCard key={slice.z ?? slice.sliceNumber} slice={slice} />
                    ))}
                </div>
            )}

            {volumeClassStats.length > 0 ? (
                <div className="px-6 py-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Whole-case segmentation statistics
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Label distribution across the full 3D segmentation volume.
                        </p>
                        {volumeTumorPercentage != null ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Tumor region: {volumeTumorPixels?.toLocaleString?.() ?? volumeTumorPixels} px
                                ({volumeTumorPercentage}% of volume)
                            </p>
                        ) : null}
                    </div>
                    <SegmentationStatsTable classStats={volumeClassStats} />
                </div>
            ) : null}
        </section>
    );
}

function Stat({ label, value, highlight = false }) {
    return (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {label}
            </p>
            <p
                className={`mt-1 text-base font-semibold ${
                    highlight
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-slate-900 dark:text-slate-100'
                }`}
            >
                {value}
            </p>
        </div>
    );
}

function SliceAnalysisCard({ slice }) {
    const z = slice.z ?? slice.sliceNumber;
    const prediction = slice.prediction;
    const predictionKey = prediction?.toLowerCase?.() ?? 'healthy';
    const predictionConfig = PREDICTION_CONFIG[predictionKey];
    const predictionLabel =
        PREDICTION_DISPLAY[prediction] ?? prediction ?? '—';
    const modalities = slice.modalities ?? {};

    return (
        <article className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-4">
            <header className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Slice {z}
                </span>
                {prediction ? (
                    <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            predictionConfig?.textColor ?? 'text-slate-700'
                        } ${predictionConfig?.bg ?? 'bg-slate-100 dark:bg-slate-800'}`}
                    >
                        {predictionLabel}
                    </span>
                ) : null}
                {slice.confidence != null ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Confidence: {slice.confidence}%
                    </span>
                ) : null}
            </header>

            <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    MRI sequences
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {MODALITY_ORDER.map((mod) => (
                        <OutputImage
                            key={mod}
                            label={MODALITY_LABELS[mod] ?? mod}
                            src={modalities[mod]}
                            compact
                        />
                    ))}
                </div>
            </div>

            {prediction && prediction !== 'Healthy' ? (
                <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        Model outputs (T1c)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <OutputImage
                            label="Visual explanation (Grad-CAM++)"
                            src={slice.xaiOverlay}
                        />
                        <OutputImage
                            label="Segmentation overlay"
                            src={slice.segmentationOverlay}
                        />
                    </div>
                </div>
            ) : null}
        </article>
    );
}

function OutputImage({ label, src, compact = false }) {
    const minH = compact ? 'min-h-[100px]' : 'min-h-[180px]';
    const maxH = compact ? 'max-h-32' : 'max-h-56';

    if (!src) {
        return (
            <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {label}
                </p>
                <div
                    className={`flex justify-center items-center rounded-md bg-slate-100 dark:bg-slate-800 ${minH}`}
                >
                    <span className="text-xs text-slate-400">N/A</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <div
                className={`flex justify-center items-center rounded-md bg-black/5 dark:bg-black/30 ${minH}`}
            >
                <img
                    src={src}
                    alt={label}
                    className={`w-full object-contain rounded-md ${maxH}`}
                    loading="lazy"
                />
            </div>
        </div>
    );
}
