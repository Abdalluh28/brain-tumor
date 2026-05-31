import { FolderOpen, RotateCcw } from "lucide-react";
import {
  viewerMetaLabel,
  viewerMetaValue,
  viewerSecondaryButton,
  viewerToolbarBorder,
} from "../viewerTheme";

export default function ViewerToolbar({
  fileInputRef,
  onFilesSelected,
  isAnyVolumeLoaded,
  onClearCase,
  currentDims,
  maxSlices,
}) {
  return (
    <div className={viewerToolbarBorder}>
      <div className="flex gap-3">
        <button
          type="button"
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium cursor-pointer transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen className="w-5 h-5" />
          Load Patient Case
        </button>
        <input
          type="file"
          multiple
          accept=".nii,.nii.gz"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => onFilesSelected(e.target.files)}
        />
        {isAnyVolumeLoaded && (
          <button type="button" className={viewerSecondaryButton} onClick={onClearCase}>
            <RotateCcw className="w-5 h-5" />
            Clear Case
          </button>
        )}
      </div>

      {isAnyVolumeLoaded && (
        <div className="flex items-center gap-6 text-sm font-mono text-slate-500 dark:text-slate-400">
          <div className="flex flex-col">
            <span className={viewerMetaLabel}>Resolution</span>
            <span className={viewerMetaValue}>{currentDims}</span>
          </div>
          <div className="w-px bg-slate-300 dark:bg-slate-800 h-8" />
          <div className="flex flex-col">
            <span className={viewerMetaLabel}>Synchronized Slices</span>
            <span className={viewerMetaValue}>{maxSlices} Slices</span>
          </div>
        </div>
      )}
    </div>
  );
}
