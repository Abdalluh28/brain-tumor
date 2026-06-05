/**
 * HTML report layout for browser print (react-to-print).
 * Uses live image URLs — no base64 preload needed unlike the PDF path.
 */
import { forwardRef } from "react";
import { PREDICTION_CONFIG } from "@/config/predictionConfig";
import {
    CLASSIFICATION_REFERENCE,
    collectFullCaseSegmentationImages,
    collectFullCaseXaiImages,
    collectMriImages,
    collectXaiImages,
    getReportPrediction,
    is3DTumorSliceReport,
} from "./reportUtils";

function DetailRow({ label, value }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-sm">{value ?? "—"}</span>
        </div>
    );
}

function PrintImage({ src, label }) {
    if (!src) return null;
    return (
        <div className="flex flex-col gap-1 rounded border border-slate-200 p-2">
            <p className="text-xs font-medium text-slate-600">{label}</p>
            <img
                src={src}
                alt={label}
                className="max-h-48 w-full object-contain rounded bg-slate-50"
            />
        </div>
    );
}

export const ScanReportPrintView = forwardRef(function ScanReportPrintView(
    { scan, scanId, date, time },
    ref,
) {
    const {
        confidenceScores,
        radiologist,
        status,
        processedTime,
        patient,
        scanType,
        segmentation,
        xai,
        fullCase,
    } = scan;

    const reportPrediction = getReportPrediction(scan);
    const config = PREDICTION_CONFIG[reportPrediction.configKey];
    const use3DTumorLayout = is3DTumorSliceReport(scan);
    const mriImages = use3DTumorLayout ? [] : collectMriImages(scan);
    const xaiImages = use3DTumorLayout ? [] : collectXaiImages(xai);
    const fullCaseXaiImages = use3DTumorLayout
        ? collectFullCaseXaiImages(fullCase)
        : [];
    const fullCaseSegmentationImages = use3DTumorLayout
        ? collectFullCaseSegmentationImages(fullCase)
        : [];
    const safeProcessedTime = processedTime ?? 0;

    return (
        // scan-report-print: targeted by @media print rules in index.css
        <div ref={ref} className="scan-report-print bg-white text-slate-900 p-8">
            <header className="border-b border-slate-200 pb-4 mb-6">
                <h1 className="text-2xl font-semibold">Classification Results</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Scan ID: {scanId} • Processed on {date} at {time}
                </p>
            </header>

            <section className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Prediction</h2>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p
                        className="text-xl font-semibold mb-2"
                        style={{ color: config?.color }}
                    >
                        {reportPrediction.text}
                    </p>
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                        <div>
                            <span className="text-slate-500">
                                {reportPrediction.confidenceLabel}:{" "}
                            </span>
                            <span className="font-medium">{reportPrediction.confidence}%</span>
                        </div>
                        {reportPrediction.isFullCase ? (
                            <>
                                <div>
                                    <span className="text-slate-500">Valid slices: </span>
                                    <span className="font-medium">
                                        {reportPrediction.fullCase.numValidSlices ?? "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Tumor slices: </span>
                                    <span className="font-medium">
                                        {reportPrediction.fullCase.numTumorSlices
                                            ?? reportPrediction.fullCase.tumorSlices?.length
                                            ?? "—"}
                                    </span>
                                </div>
                            </>
                        ) : null}
                        <div>
                            <span className="text-slate-500">Processing time: </span>
                            <span className="font-medium">
                                {(safeProcessedTime / 1000).toFixed(2)} s
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {patient && (
                <section className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">Patient</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <DetailRow label="Name" value={patient.name} />
                        <DetailRow label="Patient ID" value={patient.patientId} />
                        <DetailRow label="Age" value={String(patient.age)} />
                        <DetailRow label="Gender" value={patient.gender} />
                    </div>
                </section>
            )}

            <section className="mb-6">
                <h2 className="text-lg font-semibold mb-3">All Class Probabilities</h2>
                <div className="space-y-2">
                    {Object.entries(confidenceScores ?? {}).map(([label, prob]) => (
                        <div key={label} className="flex justify-between text-sm">
                            <span>{label}</span>
                            <span className="font-medium">{prob}%</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Scan Details</h2>
                <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="Scan ID" value={scanId} />
                    <DetailRow label="Scan type" value={scanType} />
                    <DetailRow label="Radiologist" value={radiologist} />
                    <DetailRow label="Status" value={status} />
                    <DetailRow label="Date & time" value={`${date} ${time}`} />
                </div>
            </section>

            {fullCaseXaiImages.length > 0 && (
                <section className="mb-6 break-inside-avoid">
                    <h2 className="text-lg font-semibold mb-1">
                        Original MRI &amp; Visual Explanation
                    </h2>
                    <p className="text-sm text-slate-500 mb-3">
                        T1n reference slices with Grad-CAM++ overlays on tumor-containing slices.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        {fullCaseXaiImages.map((item, idx) => (
                            <PrintImage key={idx} src={item.src} label={item.label} />
                        ))}
                    </div>
                </section>
            )}

            {fullCaseSegmentationImages.length > 0 && (
                <section className="mb-6 break-inside-avoid">
                    <h2 className="text-lg font-semibold mb-1">Tumor Segmentation</h2>
                    <p className="text-sm text-slate-500 mb-3">
                        Segmentation overlays on T1n for each tumor-containing slice.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        {fullCaseSegmentationImages.map((item, idx) => (
                            <PrintImage key={idx} src={item.src} label={item.label} />
                        ))}
                    </div>
                </section>
            )}

            {!use3DTumorLayout && mriImages.length > 0 && (
                <section className="mb-6 break-inside-avoid">
                    <h2 className="text-lg font-semibold mb-3">Original MRI</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {mriImages.map((item, idx) => (
                            <PrintImage key={idx} src={item.src} label={item.label} />
                        ))}
                    </div>
                </section>
            )}

            {!use3DTumorLayout && xaiImages.length > 0 && (
                <section className="mb-6 break-inside-avoid">
                    <h2 className="text-lg font-semibold mb-3">Visual Explanation</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {xaiImages.map((item, idx) => (
                            <PrintImage key={idx} src={item.src} label={item.label} />
                        ))}
                    </div>
                </section>
            )}

            {!use3DTumorLayout && (segmentation?.maskPath || segmentation?.overlayPath) && (
                <section className="mb-6 break-inside-avoid">
                    <h2 className="text-lg font-semibold mb-3">Segmentation</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <PrintImage src={segmentation?.maskPath} label="Segmentation Mask" />
                        <PrintImage src={segmentation?.overlayPath} label="Segmentation Overlay" />
                    </div>
                </section>
            )}

            {!use3DTumorLayout && segmentation?.classStats?.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">Segmentation Breakdown</h2>
                    <table className="w-full text-sm border border-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left p-2 font-medium">Class</th>
                                <th className="text-right p-2 font-medium">Pixels</th>
                                <th className="text-right p-2 font-medium">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {segmentation.classStats.map((row) => (
                                <tr key={row.classId} className="border-t border-slate-100">
                                    <td className="p-2">{row.label}</td>
                                    <td className="p-2 text-right tabular-nums">
                                        {row.pixelCount?.toLocaleString?.() ?? row.pixelCount}
                                    </td>
                                    <td className="p-2 text-right tabular-nums">
                                        {row.percentage}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            <section className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Classification Reference</h2>
                <div className="grid grid-cols-2 gap-3">
                    {CLASSIFICATION_REFERENCE.map((item) => (
                        <div key={item.title} className="rounded bg-slate-50 p-3">
                            <p className="font-semibold text-sm">{item.title}</p>
                            <p className="text-xs text-slate-600">{item.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <p className="text-xs text-slate-400 italic">
                This report was generated by an AI-assisted classification system and is
                intended for research and decision support only. It does not replace
                professional medical diagnosis.
            </p>
        </div>
    );
});
