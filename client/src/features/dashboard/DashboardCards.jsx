import { Brain, CircleCheckBig, Activity, TrendingUp } from 'lucide-react'
import React from 'react'

export default function DashboardCards() {
    return (
        <div
            className="
        grid gap-4 p-4
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-4
      "
        >
            {/* Card 1 */}
            <div className="flex justify-between bg-white dark:bg-background dark:border dark:border-slate-700 p-4 rounded-lg">
                <div className="flex flex-col gap-4">
                    <div className="bg-primary rounded-xl p-3 w-fit">
                        <Brain className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Scans</p>
                        <p className="text-xl font-semibold">20</p>
                    </div>
                </div>
                <div className="text-dashboard-numbers bg-dashboard-numbers-bg h-fit p-1 rounded-lg">
                    +12%
                </div>
            </div>

            {/* Card 2 */}
            <div className="flex justify-between bg-white dark:bg-background dark:border dark:border-slate-700 p-4 rounded-lg">
                <div className="flex flex-col gap-4">
                    <div className="bg-dashboard-card-2 rounded-xl p-3 w-fit">
                        <CircleCheckBig className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Model Accuracy</p>
                        <p className="text-xl font-semibold">96.4%</p>
                    </div>
                </div>
                <div className="text-dashboard-numbers bg-dashboard-numbers-bg h-fit p-1 rounded-lg">
                    +2.3%
                </div>
            </div>

            {/* Card 3 */}
            <div className="flex justify-between bg-white dark:bg-background dark:border dark:border-slate-700 p-4 rounded-lg">
                <div className="flex flex-col gap-4">
                    <div className="bg-dashboard-card-3 rounded-xl p-3 w-fit">
                        <Activity className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Model Version</p>
                        <p className="text-xl font-semibold">v0.1</p>
                    </div>
                </div>
                <div className="text-dashboard-numbers bg-dashboard-numbers-bg h-fit p-1 rounded-lg">
                    Latest
                </div>
            </div>

            {/* Card 4 */}
            <div className="flex justify-between bg-white dark:bg-background dark:border dark:border-slate-700 p-4 rounded-lg">
                <div className="flex flex-col gap-4">
                    <div className="bg-dashboard-card-4 rounded-xl p-3 w-fit">
                        <TrendingUp className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Avg Confidence</p>
                        <p className="text-xl font-semibold">95%</p>
                    </div>
                </div>
                <div className="text-dashboard-numbers bg-dashboard-numbers-bg h-fit p-1 rounded-lg">
                    +4.6%
                </div>
            </div>
        </div>
    )
}
