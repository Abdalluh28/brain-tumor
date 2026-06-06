import { PREDICTION_CONFIG } from '@/config/predictionConfig';


const CASE_PREDICTION_CONFIG = {
    gli: {
        text: 'Glioma (GLI) — full case',
        key: 'hgg',
    },
    mets: {
        text: 'Metastasis (METS) — full case',
        key: 'metastasis',
    },
    other: {
        text: 'Other tumor (OTHER) — full case',
        key: 'others',
    },
    healthy: {
        text: 'No Tumor Detected (Healthy)',
        key: 'healthy',
    },
};

export default function ScanIdResult({
    prediction,
    confidence,
    processedTimeMs,
    fullCase,
    scanType,
}) {
    const safeProcessedTime = processedTimeMs ?? 0;
    const useFullCase = scanType === '3D' && fullCase?.casePrediction;
    const caseKey = useFullCase
        ? fullCase.casePrediction.toLowerCase()
        : prediction?.toLowerCase() || 'healthy';
    const caseMeta = useFullCase ? CASE_PREDICTION_CONFIG[caseKey] : null;
    const configKey = caseMeta?.key ?? caseKey;
    const config = PREDICTION_CONFIG[configKey];
    const displayConfidence = confidence;
    const predictionText = caseMeta
        ? caseMeta.text
        : caseKey === 'healthy'
            ? 'No Tumor Detected (Healthy)'
            : `${prediction} Tumor Detected`;

    if (!config) return null; // safety guard

    const { textColor, iconColor, bg, border, Icon } = config;

    return (
        <div className={`flex items-center justify-between col-span-3 ${bg} p-8 rounded-xl shadow-md border-2 ${border}`}>
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <p className="text-slate-600 dark:text-slate-400 text-[15px]">
                        Predicted Classification
                    </p>
                    <p className={`${textColor} font-semibold text-2xl`}>
                        {predictionText}
                    </p>
                </div>

                <div className="flex gap-4">
                    <InfoBlock
                        label="Confidence"
                        value={`${displayConfidence} %`}
                        color={textColor}
                        size='font-semibold text-lg'
                    />
                    <InfoBlock label="Processing time" value={`${(safeProcessedTime / 1000).toFixed(2)} s`} />
                </div>
            </div>

            <div className={iconColor}>
                <Icon size={75} />
            </div>
        </div>
    );
}

function InfoBlock({ label, value, color, size }) {
    return (
        <div className="flex flex-col gap-1">
            <p className="text-slate-600 dark:text-slate-400 text-[15px]">
                {label}
            </p>
            <p className={`${color ?? ''} ${size ?? ''}`}>
                {value}
            </p>
        </div>
    );
}
