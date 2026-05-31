export default function ViewerLoadingOverlay({ message, progress }) {
  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 rounded-2xl flex flex-col items-center justify-center gap-4 z-50 backdrop-blur-sm">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary" />
      <div className="flex flex-col items-center gap-2">
        <p className="text-xl font-medium text-slate-800 dark:text-slate-200">
          {message}
        </p>
        <div className="w-64 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {progress}% completed
        </p>
      </div>
    </div>
  );
}
