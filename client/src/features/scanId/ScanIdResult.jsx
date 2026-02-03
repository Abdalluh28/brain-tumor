import { PREDICTION_CONFIG } from '@/config/predictionConfig';


export default function ScanIdResult({
    prediction,
    confidence,
    modelVersion,
    processedTimeMs,
}) {
    const key = prediction.toLowerCase();
    const config = PREDICTION_CONFIG[key];
    const predictionText = key === 'healthy' ? 'No Tumor Detected (Healthy)' : `${prediction} Tumor Detected`;

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
                    <InfoBlock label="Confidence" value={`${confidence} %`} color={textColor} size='font-semibold text-lg' />
                    <InfoBlock label="Model Version" value={modelVersion} />
                    <InfoBlock label="Processed Time" value={`${(processedTimeMs / 1000).toFixed(2)} s`} />
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
