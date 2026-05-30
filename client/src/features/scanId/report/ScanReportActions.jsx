/**
 * Download (PDF) and Print actions for the scan detail page.
 * PDF: @react-pdf/renderer (lazy-loaded). Print: react-to-print on ScanReportPrintView.
 */
import { useRef, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { ScanReportPrintView } from "./ScanReportPrintView";
import { preloadReportImages, waitForImages } from "./reportUtils";

export default function ScanReportActions({ scan, scanId, date, time }) {
    const printRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Scan Report ${scanId}`,
    });

    async function onDownload() {
        setIsDownloading(true);
        try {
            // Code-split react-pdf (~1.5 MB) — only loaded when user clicks Download
            const [{ pdf }, { ScanReportDocument }] = await Promise.all([
                import("@react-pdf/renderer"),
                import("./ScanReportDocument"),
            ]);
            const images = await preloadReportImages(scan);
            const blob = await pdf(
                <ScanReportDocument
                    scan={scan}
                    scanId={scanId}
                    date={date}
                    time={time}
                    images={images}
                />,
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `scan-report-${scanId}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Report downloaded");
        } catch {
            toast.error("Could not generate the PDF report");
        } finally {
            setIsDownloading(false);
        }
    }

    async function onPrint() {
        setIsPrinting(true);
        try {
            // Wait for off-screen images before opening the print dialog
            await waitForImages(printRef.current);
            handlePrint();
        } catch {
            toast.error("Could not open the print dialog");
        } finally {
            setIsPrinting(false);
        }
    }

    const busy = isDownloading || isPrinting;

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    disabled={busy}
                    onClick={onDownload}
                >
                    {isDownloading ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Download />
                    )}
                    Download PDF
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={onPrint}
                >
                    {isPrinting ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Printer />
                    )}
                    Print
                </Button>
            </div>

            {/* Off-screen DOM clone used by react-to-print (must stay mounted) */}
            <div className="fixed left-[-9999px] top-0" aria-hidden="true">
                <ScanReportPrintView
                    ref={printRef}
                    scan={scan}
                    scanId={scanId}
                    date={date}
                    time={time}
                />
            </div>
        </>
    );
}
