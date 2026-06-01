import SkeletonLoader from '@/components/SkeletonLoader';
import { Brain, TrendingUp } from 'lucide-react';
import { useDashboardStats } from './useDashboardStats';

export default function DashboardCards() {

    const { stats, isLoading } = useDashboardStats();
    const { totalScans, avgConfidence } = stats || {};


    if (isLoading) {
        return <SkeletonLoader count={2} />
    }

    return (
        <div
            className="
        grid gap-4 p-4
        grid-cols-1
        sm:grid-cols-2
      "
        >
            <div className="flex justify-between bg-white dark:bg-background dark:border dark:border-slate-700 p-4 rounded-lg">
                <div className="flex flex-col gap-4">
                    <div className="bg-primary rounded-xl p-3 w-fit">
                        <Brain className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total scans</p>
                        <p className="text-xl font-semibold">{totalScans}</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-between bg-white dark:bg-background dark:border dark:border-slate-700 p-4 rounded-lg">
                <div className="flex flex-col gap-4">
                    <div className="bg-dashboard-card-4 rounded-xl p-3 w-fit">
                        <TrendingUp className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Average confidence</p>
                        <p className="text-xl font-semibold">{avgConfidence?.toFixed(1)}%</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
