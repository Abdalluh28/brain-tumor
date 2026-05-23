import React from 'react'

export default function ScanIdSegmentation({ segmentation }) {
    if (!segmentation) {
        return null
    }

    const {
        modelType,
        maskPath,
        overlayPath,
        legendPath,
        distributionPath,
        classStats = [],
        metadata = {},
    } = segmentation

    return (
        <div className="flex flex-col gap-6 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl">
            <div className="flex flex-col gap-1">
                <p className="font-semibold text-xl">Tumor Segmentation</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {modelType} model — mask, T1 overlay, class legend, and pixel distribution
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
                <SegmentationPanel title="Class legend" src={legendPath} alt="Segmentation legend" />
                <SegmentationPanel
                    title="Class distribution (pixels)"
                    src={distributionPath}
                    alt="Segmentation class distribution"
                />
            </div>

            {classStats.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="text-left p-3 font-medium">Class</th>
                                <th className="text-left p-3 font-medium">Color</th>
                                <th className="text-right p-3 font-medium">Pixels</th>
                                <th className="text-right p-3 font-medium">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classStats.map((row) => (
                                <tr
                                    key={row.classId}
                                    className="border-t border-slate-100 dark:border-slate-700"
                                >
                                    <td className="p-3">{row.label}</td>
                                    <td className="p-3">
                                        <span
                                            className="inline-block w-5 h-5 rounded border border-slate-300"
                                            style={{ backgroundColor: row.colorHex }}
                                        />
                                    </td>
                                    <td className="p-3 text-right tabular-nums">
                                        {row.pixelCount.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right tabular-nums">
                                        {row.percentage}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
