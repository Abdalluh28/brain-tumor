import HistoryHeader from '@/features/history/HistoryHeader'
import HistoryTable from '@/features/history/HistoryTable'
import SearchAndFilter from '@/features/history/SearchAndFilter'

export default function History() {
    return (
        <div>
            <HistoryHeader />
            <div className="flex flex-col gap-6 px-4 lg:px-8 py-8">
                <SearchAndFilter />
                <div className='grid lg:grid-cols-3 grid-cols-1'>
                    <HistoryTable />
                </div>
            </div>
        </div>
    )
}
