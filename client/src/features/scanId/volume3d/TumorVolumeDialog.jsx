import { useMemo, useState } from "react";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import Spinner from "@/components/Spinner";
import TumorVolumeViewer from "./TumorVolumeViewer";
import { getVolume3dSources } from "./scanVolumeSources";
import { SEGMENTATION_LABELS } from "./segmentationLabels";
import { BRAIN_SHELL_LEGEND_COLOR } from "./brainShellStyle";

const READY_STATUSES = new Set([
    "Drag to rotate · scroll to zoom inside tumor regions",
    "No tumor voxels in mask · brain only",
]);

function isErrorStatus(status) {
    return /failed|not a valid|error/i.test(status ?? "");
}

export default function TumorVolumeDialog({ files, maskNiftiPath }) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState("Preparing 3D viewer…");

    const { mriUrl, maskUrl, canVisualize } = useMemo(
        () => getVolume3dSources(files, maskNiftiPath),
        [files, maskNiftiPath],
    );

    const hasError = isErrorStatus(status);
    const isLoading = open && !READY_STATUSES.has(status) && !hasError;

    if (!canVisualize) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) {
                    setStatus("Preparing 3D viewer…");
                }
            }}
        >
            <DialogTrigger asChild>
                <Button type="button" variant="default" className="gap-2">
                    <Box className="size-4" />
                    View 3D tumor overlay
                </Button>
            </DialogTrigger>
            <DialogContent
                className="flex max-h-[92vh] w-[min(96vw,980px)] max-w-none flex-col gap-4 overflow-hidden sm:max-w-none"
                showCloseButton
            >
                <DialogHeader>
                    <DialogTitle>3D tumor segmentation</DialogTitle>
                    <DialogDescription>
                        T1ce brain shell (transparent) with per-label tumor regions.
                        Rotate with drag and scroll to zoom inside edema and see
                        nested structures. Closing this window keeps your scan results
                        on the page.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative min-h-[min(70vh,640px)]">
                    {open ? (
                        <TumorVolumeViewer
                            mriUrl={mriUrl}
                            maskUrl={maskUrl}
                            onStatusChange={setStatus}
                        />
                    ) : null}

                    {isLoading ? (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#e8e0f4]/80">
                            <Spinner />
                            <p className="text-sm font-medium text-slate-700">
                                {status}
                            </p>
                        </div>
                    ) : null}
                </div>

                {!isLoading && status ? (
                    <div className="flex flex-col items-center gap-3">
                        <p
                            className={`text-center text-xs ${
                                hasError
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-slate-500 dark:text-slate-400"
                            }`}
                        >
                            {status}
                        </p>
                        {!hasError && READY_STATUSES.has(status) ? (
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                                <LegendSwatch
                                    color={BRAIN_SHELL_LEGEND_COLOR}
                                    label="Brain (T1ce shell)"
                                />
                                {SEGMENTATION_LABELS.map((label) => (
                                    <LegendSwatch
                                        key={label.id}
                                        color={label.hex}
                                        label={label.name}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function LegendSwatch({ color, label }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span
                className="size-3 rounded-full border border-black/10"
                style={{ backgroundColor: color }}
            />
            {label}
        </span>
    );
}
