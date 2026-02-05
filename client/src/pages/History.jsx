import FilterBy from '@/features/history/FilterBy'
import HistoryHeader from '@/features/history/HistoryHeader'
import HistoryTable from '@/features/history/HistoryTable'
import SearchBar from '@/features/history/SearchBar'
import React from 'react'

export default function History() {
    return (
        <div>
            <HistoryHeader />
            <div className="flex flex-col gap-6 px-4 lg:px-8 py-8">
                <div className='bg-white dark:bg-background dark:border dark:border-slate-600 grid lg:grid-cols-3 grid-cols-1 gap-4 p-6 shadow-md rounded-xl border border-slate-200'>
                    <SearchBar />
                    <FilterBy />
                </div>
                <div className='grid lg:grid-cols-3 grid-cols-1'>
                    <HistoryTable />
                </div>
            </div>
        </div>
    )
}
