import {
    Document,
    Image,
    Page,
    Text,
    View,
} from "@react-pdf/renderer";
import { PREDICTION_CONFIG } from "@/config/predictionConfig";
import {
    CLASSIFICATION_REFERENCE,
    getReportPrediction,
} from "./reportUtils";
import { pdfStyles as styles } from "./reportPdfStyles";

/** PDF document for scan report download. Images must be preloaded base64 from reportUtils. */
function DetailItem({ label, value }) {
    return (
        <View style={styles.detailItem}>
            <Text style={styles.label}>{label}</Text>
            <Text>{value ?? "—"}</Text>
        </View>
    );
}

function ReportImage({ src, label }) {
    if (!src) return null;
    return (
        <View style={styles.imageCard}>
            <Image src={src} style={styles.image} />
            <Text style={styles.imageLabel}>{label}</Text>
        </View>
    );
}

export function ScanReportDocument({
    scan,
    scanId,
    date,
    time,
    images = {},
}) {
    const {
        confidenceScores,
        radiologist,
        status,
        processedTime,
        patient,
        scanType,
        segmentation,
    } = scan;

    const reportPrediction = getReportPrediction(scan);
    const config = PREDICTION_CONFIG[reportPrediction.configKey];
    const predictionColor = config?.color ?? "#1e293b";
    const safeProcessedTime = processedTime ?? 0;
    const use3DTumorLayout = images.use3DTumorLayout;

    return (
        <Document title={`Scan Report ${scanId}`}>
            {/* wrap: auto-paginate when XAI / segmentation images exceed one page */}
            <Page size="A4" style={styles.page} wrap>
                <View style={styles.header}>
                    <Text style={styles.title}>Classification Results</Text>
                    <Text style={styles.subtitle}>
                        Scan ID: {scanId} • Processed on {date} at {time}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Prediction</Text>
                    <View style={styles.resultBox}>
                        <Text style={[styles.prediction, { color: predictionColor }]}>
                            {reportPrediction.text}
                        </Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>{reportPrediction.confidenceLabel}</Text>
                            <Text>{reportPrediction.confidence}%</Text>
                        </View>
                        {reportPrediction.isFullCase ? (
                            <>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Valid slices</Text>
                                    <Text>{reportPrediction.fullCase.numValidSlices ?? "—"}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Tumor slices</Text>
                                    <Text>
                                        {reportPrediction.fullCase.numTumorSlices
                                            ?? reportPrediction.fullCase.tumorSlices?.length
                                            ?? "—"}
                                    </Text>
                                </View>
                            </>
                        ) : null}
                        <View style={styles.row}>
                            <Text style={styles.label}>Processing time</Text>
                            <Text>{(safeProcessedTime / 1000).toFixed(2)} s</Text>
                        </View>
                    </View>
                </View>

                {patient && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Patient</Text>
                        <View style={styles.detailGrid}>
                            <DetailItem label="Name" value={patient.name} />
                            <DetailItem label="Patient ID" value={patient.patientId} />
                            <DetailItem label="Age" value={String(patient.age)} />
                            <DetailItem label="Gender" value={patient.gender} />
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>All Class Probabilities</Text>
                    {Object.entries(confidenceScores ?? {}).map(([label, prob]) => (
                        <View key={label} style={styles.row}>
                            <Text>{label}</Text>
                            <Text>{prob}%</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Scan Details</Text>
                    <View style={styles.detailGrid}>
                        <DetailItem label="Scan ID" value={scanId} />
                        <DetailItem label="Scan type" value={scanType} />
                        <DetailItem label="Radiologist" value={radiologist} />
                        <DetailItem label="Status" value={status} />
                        <DetailItem label="Date & time" value={`${date} ${time}`} />
                    </View>
                </View>

                {images.fullCaseXai?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Original MRI & Visual Explanation
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                            T1n reference slices with Grad-CAM++ overlays on tumor-containing slices.
                        </Text>
                        <View style={styles.imageGrid}>
                            {images.fullCaseXai.map((item, idx) => (
                                <ReportImage key={idx} src={item.src} label={item.label} />
                            ))}
                        </View>
                    </View>
                )}

                {images.fullCaseSegmentation?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tumor Segmentation</Text>
                        <Text style={styles.sectionSubtitle}>
                            Segmentation overlays on T1n for each tumor-containing slice.
                        </Text>
                        <View style={styles.imageGrid}>
                            {images.fullCaseSegmentation.map((item, idx) => (
                                <ReportImage key={idx} src={item.src} label={item.label} />
                            ))}
                        </View>
                    </View>
                )}

                {!use3DTumorLayout && images.mri?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Original MRI</Text>
                        <View style={styles.imageGrid}>
                            {images.mri.map((item, idx) => (
                                <ReportImage key={idx} src={item.src} label={item.label} />
                            ))}
                        </View>
                    </View>
                )}

                {!use3DTumorLayout && images.xai?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Visual Explanation</Text>
                        <View style={styles.imageGrid}>
                            {images.xai.map((item, idx) => (
                                <ReportImage key={idx} src={item.src} label={item.label} />
                            ))}
                        </View>
                    </View>
                )}

                {!use3DTumorLayout && (images.segMask || images.segOverlay) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Segmentation</Text>
                        <View style={styles.imageGrid}>
                            <ReportImage src={images.segMask} label="Segmentation Mask" />
                            <ReportImage src={images.segOverlay} label="Segmentation Overlay" />
                        </View>
                    </View>
                )}

                {!use3DTumorLayout && segmentation?.classStats?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Segmentation Breakdown</Text>
                        {segmentation.classStats.map((row) => (
                            <View key={row.classId} style={styles.row}>
                                <Text>{row.label}</Text>
                                <Text>
                                    {row.pixelCount?.toLocaleString?.() ?? row.pixelCount} px ({row.percentage}%)
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Classification Reference</Text>
                    <View style={styles.legendGrid}>
                        {CLASSIFICATION_REFERENCE.map((item) => (
                            <View key={item.title} style={styles.legendItem}>
                                <Text style={styles.legendTitle}>{item.title}</Text>
                                <Text style={styles.legendText}>{item.text}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={styles.disclaimer}>
                    This report was generated by an AI-assisted classification system and is
                    intended for research and decision support only. It does not replace
                    professional medical diagnosis.
                </Text>

                <Text style={styles.footer} render={({ pageNumber, totalPages }) =>
                    `Brain TUOMR • Page ${pageNumber} of ${totalPages}`
                } fixed />
            </Page>
        </Document>
    );
}
