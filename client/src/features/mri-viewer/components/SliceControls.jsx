import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { viewerControlButton, viewerPanelInset } from "../viewerTheme";

export default function SliceControls({
  sliceIndex,
  maxSlices,
  isPlaying,
  onTogglePlay,
  onPrevSlice,
  onNextSlice,
  onResetToCenter,
  onSliceChange,
}) {
  return (
    <div className={viewerPanelInset}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`p-3 rounded-lg border cursor-pointer transition ${isPlaying ? "bg-primary border-primary text-white" : viewerControlButton}`}
            onClick={onTogglePlay}
            title={isPlaying ? "Pause cinematic loop" : "Play cinematic loop"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          <button
            type="button"
            className={viewerControlButton}
            onClick={onPrevSlice}
            disabled={sliceIndex === 0}
            title="Previous slice"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            className={viewerControlButton}
            onClick={onNextSlice}
            disabled={sliceIndex === maxSlices - 1}
            title="Next slice"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            className={viewerControlButton}
            onClick={onResetToCenter}
            title="Reset to center slice"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-w-[200px] flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">0</span>
          <input
            type="range"
            min={0}
            max={maxSlices - 1}
            value={sliceIndex}
            onChange={(e) => onSliceChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary border border-slate-300 dark:border-slate-700"
          />
          <span className="text-xs text-slate-500 font-mono">
            {maxSlices - 1}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-300">
          <span>SLICE</span>
          <span className="text-primary font-bold text-base">
            {sliceIndex + 1}
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span>{maxSlices}</span>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-900 pt-3 flex-wrap gap-2 mt-4">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
          <span>
            Control shortcuts: Use Keyboard Up/Right/Down/Left arrows or hover
            and scroll mouse wheel to navigate slices.
          </span>
        </div>
      </div>
    </div>
  );
}
