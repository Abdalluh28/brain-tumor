import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'
import { data } from '@/data'
import HistoryTableCell from './HistoryTableCell'

export default function HistoryTable() {
    return (
        <div className='history lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto'>
            <table className="w-full table-auto border-collapse">
                <thead className='border-b border-slate-200 dark:border-slate-700'>
                    <tr className='text-left text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800'>
                        <th className='p-4 font-medium'>Scan ID</th>
                        <th className='p-4 font-medium'>Patient ID</th>
                        <th className='p-4 font-medium'>Date & Time</th>
                        <th className='p-4 font-medium'>Prediction</th>
                        <th className='p-4 font-medium'>Confidence</th>
                        <th className='p-4 font-medium'>Status</th>
                        <th className='p-4 font-medium'>Radiologist</th>
                        <th className='p-4 font-medium'>Action</th>
                    </tr>
                </thead>
                <tbody className='bg-white dark:bg-background divide-y divide-slate-200 dark:divide-slate-600'>
                    {data.slice(0, 10).map(item => (
                        <tr key={item.scanId} className='border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-300'>
                            <HistoryTableCell item={item} />
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className='flex justify-between items-center p-6 text-sm text-slate-600 dark:text-slate-400'>
                {/* Pagination */}
                <p>Showing 1 to 10 of 10 scans</p>
                <div className='flex gap-2 items-center'>
                    <button className='cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-300'>
                        <ChevronLeft />
                    </button>
                    <p>Page 1 of 1</p>
                    <button className='cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-300'>
                        <ChevronRight />
                    </button>
                </div>
            </div>
        </div>
    )
}
