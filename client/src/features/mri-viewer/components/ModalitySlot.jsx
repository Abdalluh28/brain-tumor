import { useRef } from "react";
import { FileUp } from "lucide-react";
import { MODALITY_NAMES } from "../constants";
import { viewerCard, viewerOverlayChip } from "../viewerTheme";

export default function ModalitySlot({
  slotIdx,
  vol,
  sliceIndex,
  canvasRef,
  onRemove,
  onSlotUpload,
}) {
  const fileInputRef = useRef(null);
  return (
    <div className={viewerCard}>
      <div
        className={`${viewerOverlayChip} absolute top-3 left-3 font-semibold text-primary uppercase font-mono`}
      >
        {MODALITY_NAMES[slotIdx].split(" ")[0]}
      </div>
      <div
        className={`${viewerOverlayChip} absolute top-3 right-3 text-slate-600 dark:text-slate-300 font-mono`}
      >
        {vol ? `Slice ${sliceIndex + 1}/${vol.slices}` : "No Volume"}
      </div>

      {vol ? (
        <>
          <div
            className={`${viewerOverlayChip} absolute bottom-3 left-3 right-3 text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate`}
          >
            {vol.file.name}
          </div>
          <button
            type="button"
            className="absolute bottom-3 right-3 bg-red-100 hover:bg-red-200 dark:bg-red-950/90 dark:hover:bg-red-900/95 text-red-700 dark:text-red-400 text-xs font-semibold px-2.5 py-1.5 rounded-lg backdrop-blur border border-red-300 dark:border-red-900/50 z-20 cursor-pointer hidden group-hover:block transition"
            onClick={() => onRemove(slotIdx)}
          >
            Remove
          </button>
          <div className="w-full h-full bg-black flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain cursor-ns-resize"
            />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950/70 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl m-2 self-center max-w-[calc(100%-1rem)] max-h-[calc(100%-1rem)]">
          <FileUp className="w-10 h-10 text-slate-400 dark:text-slate-700 mb-3" />
          <p className="font-semibold text-slate-700 dark:text-slate-400 text-sm mb-1">
            {MODALITY_NAMES[slotIdx]}
          </p>
          <p className="text-slate-500 dark:text-slate-600 text-xs mb-4">
            No volume mapped to this slot
          </p>
          <button
            type="button"
            className="bg-slate-200 hover:bg-slate-300 border border-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 px-3.5 py-1.5 rounded-lg cursor-pointer transition"
            onClick={() => fileInputRef.current?.click()}
          >
            Select NIfTI File
          </button>
          <input
            type="file"
            accept=".nii,.nii.gz"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              onSlotUpload(e, slotIdx);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
