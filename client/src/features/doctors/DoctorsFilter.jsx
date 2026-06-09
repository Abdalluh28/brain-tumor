
export default function DoctorsFilter({ invitePage }) {

    if (invitePage) return null

    return (
        <div class="flex gap-2">
            <button class="px-4 py-2.5 rounded-xl text-sm transition-colors bg-blue-600 text-white">
                All
            </button>
            <button class="px-4 py-2.5 rounded-xl text-sm transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                Active
            </button>
            <button class="px-4 py-2.5 rounded-xl text-sm transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                Inactive
            </button>
            <button class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                <span>
                    Pending
                </span>
                <span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    1
                </span>
            </button>
        </div>
    )
}
