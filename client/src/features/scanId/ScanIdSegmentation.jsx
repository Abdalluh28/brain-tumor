import React from 'react'
import SegmentationStatsTable from './SegmentationStatsTable'

export default function ScanIdSegmentation({ segmentation }) {
    if (!segmentation) {
        return null
    }

    const {
        maskPath,
        overlayPath,
        classStats = [],
        metadata = {},
    } = segmentation

    return (
        <div className="flex flex-col gap-6 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
            <div className="flex flex-col gap-1">
                <p className="font-semibold text-xl">Tumor Segmentation</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Segmentation mask, T1 overlay, class legend, and region
                    breakdown
                </p>
                {metadata.tumorPercentage != null && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tumor region: {metadata.tumorPixels?.toLocaleString?.() ?? metadata.tumorPixels} px
                        ({metadata.tumorPercentage}% of slice)
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SegmentationPanel title="Color mask" src={maskPath} alt="Segmentation mask" />
                <SegmentationPanel
                    title="Overlay on T1"
                    src={overlayPath}
                    alt="T1 overlay with segmentation"
                />
            </div>

            {classStats.length > 0 && (
                <SegmentationStatsTable classStats={classStats} />
            )}
        </div>
    )
}

function SegmentationPanel({ title, src, alt }) {
    if (!src) return null

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-3 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
            <div className="flex justify-center items-center min-h-[200px] bg-black/5 dark:bg-black/20 rounded-md">
                <img
                    src={src}
                    alt={alt}
                    className="max-h-64 w-full object-contain rounded-md"
                />
            </div>
        </div>
    )
}
