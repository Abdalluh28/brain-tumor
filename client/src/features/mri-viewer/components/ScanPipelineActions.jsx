import { Box, Sparkles } from "lucide-react";
import { viewerActionCard, viewerVolumeButton } from "../viewerTheme";

export default function ScanPipelineActions({
  sliceIndex,
  onScanSlice,
  onScanVolume,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
      <div className={viewerActionCard}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-lg">
            <Sparkles className="w-5 h-5" />
            <h3>Scan Current Slice (2D Mode)</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Capture this specific cross-section (Slice #{sliceIndex + 1}) across
            all 4 modalities. The 4 generated 2D PNG images and patient details
            will be pre-loaded into the standard MRI classification pipeline.
          </p>
        </div>
        <button
          type="button"
          className="bg-primary hover:bg-primary-hover text-white rounded-xl p-3.5 font-medium cursor-pointer transition text-center shadow-lg hover:shadow-primary/10"
          onClick={onScanSlice}
        >
          Capture & Scan Slice #{sliceIndex + 1}
        </button>
      </div>

      <div className={viewerActionCard}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-lg">
            <Box className="w-5 h-5" />
            <h3>Scan Full Volume (3D Mode)</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Send the full 3D co-registered volumes and patient details directly
            into the 3D pipeline. This executes volumetric tumor localization,
            classification, and volumetric segmentation analysis.
          </p>
        </div>
        <button
          type="button"
          className={viewerVolumeButton}
          onClick={onScanVolume}
        >
          Submit 3D Volumetric Case
        </button>
      </div>
    </div>
  );
}
