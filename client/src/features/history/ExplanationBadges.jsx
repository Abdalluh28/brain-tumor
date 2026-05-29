import { listStoredXaiViews } from "@/services/xaiApi";

export default function ExplanationBadges({ xai }) {
    const views = listStoredXaiViews(xai);

    if (views.length === 0) {
        return (
            <span className="text-xs text-slate-400">None</span>
        );
    }

    return (
        <div className="flex flex-wrap gap-1">
            {views.map((view) => (
                <span
                    key={view.id}
                    className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                    {view.label}
                </span>
            ))}
        </div>
    );
}
