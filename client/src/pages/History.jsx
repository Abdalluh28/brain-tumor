import HistoryHeader from '@/features/history/HistoryHeader'
import HistoryTable from '@/features/history/HistoryTable'
import SearchAndFilter from '@/features/history/SearchAndFilter'

export default function History() {
    return (
        <div>
            <HistoryHeader />
            <div className="flex flex-col gap-6 px-4 lg:px-8 py-8">
                <SearchAndFilter />
                <HistoryTable />
            </div>
        </div>
    )
}
