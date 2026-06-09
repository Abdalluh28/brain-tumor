import SkeletonLoader from '@/components/SkeletonLoader';
import { usePagination } from '@/hooks/usePagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HistoryTableCell from './HistoryTableCell';
import { useScans } from './useScans';

export default function HistoryTable() {

    const { scans, currentPage, totalPages, totalScans, start, end, isLoading } = useScans()

    // handle pagination
    const { handlePrevPage, handleNextPage } = usePagination({ currentPage, totalPages })

    // handle if loading
    if (isLoading) return (
        <SkeletonLoader height={320} />
    )


    // handle if no scans
    if (scans.length === 0) return (
        <div className='flex justify-center items-center lg:col-span-3'>
            <p className='text-slate-600 dark:text-slate-400'>No scans found</p>
        </div>
    )

    return (
        <div className='grid lg:grid-cols-3 grid-cols-1'>
            <div className='history lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto'>
                <table className="w-full table-auto border-collapse">
                    <thead className='border-b border-slate-200 dark:border-slate-700'>
                        <tr className='text-left text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800'>
                            <th className='p-4 font-medium'>Patient Name</th>
                            <th className='p-4 font-medium'>Date & Time</th>
                            <th className='p-4 font-medium'>Prediction</th>
                            <th className='p-4 font-medium'>Confidence</th>
                            <th className='p-4 font-medium'>Explanations</th>
                            <th className='p-4 font-medium'>Status</th>
                            <th className='p-4 font-medium'>Radiologist</th>
                            <th className='p-4 font-medium'>Action</th>
                        </tr>
                    </thead>
                    <tbody className='bg-white dark:bg-background divide-y divide-slate-200 dark:divide-slate-600'>
                        {scans.map(scan => (
                            <tr key={scan._id} className='border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-300'>
                                <HistoryTableCell scan={scan} />
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className='flex justify-between items-center p-6 text-sm text-slate-600 dark:text-slate-400'>
                    {/* Pagination */}
                    <p>Showing {start} to {end} of {totalScans} scans</p>
                    <div className='flex gap-2 items-center'>
                        <button className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-300 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}>
                            <ChevronLeft />
                        </button>
                        <p>Page {currentPage} of {totalPages}</p>
                        <button className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-300 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}>
                            <ChevronRight />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
