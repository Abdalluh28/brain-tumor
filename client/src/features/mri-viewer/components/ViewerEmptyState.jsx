import { Upload } from "lucide-react";
import { viewerEmptyDropzone } from "../viewerTheme";

export default function ViewerEmptyState({ onBrowse }) {
  return (
    <div className={viewerEmptyDropzone} onClick={onBrowse}>
      <div className="p-4 bg-primary/10 text-primary rounded-full">
        <Upload size={40} className="animate-bounce" />
      </div>
      <div className="flex flex-col gap-1 max-w-md">
        <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Load a BraTS MRI Scan Case
        </p>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Click here to select or drag & drop 4 co-registered NIfTI files (.nii
          or .nii.gz) representing T1, T1ce, T2, and FLAIR modalities.
        </p>
      </div>
      <div className="flex gap-2 text-xs font-mono text-slate-600 dark:text-slate-500 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
        <span>
          Tip: Files containing &apos;t1&apos;, &apos;t1ce&apos;, &apos;t2&apos;,
          &apos;flair&apos; are auto-mapped!
        </span>
      </div>
    </div>
  );
}
