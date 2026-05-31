export default function ViewerLoadingOverlay({ message, progress }) {
  const showProgress = progress > 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/85 dark:bg-slate-950/85 backdrop-blur-[2px]">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-primary border-b-primary dark:border-slate-700" />
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
          {message || "Processing NIfTI volume..."}
        </p>
        {showProgress && (
          <>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {progress}% completed
            </p>
          </>
        )}
      </div>
    </div>
  );
}
