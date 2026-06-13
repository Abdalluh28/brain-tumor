import SkeletonLoader from '@/components/SkeletonLoader';
import { useGetCenters } from './services/useGetCenters';
import TableCell from './TableCell';
import { usePagination } from '@/hooks/usePagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Table() {

    const { centers, currentPage, totalPages, totalCenters, start, end, isLoading } = useGetCenters();

    const { handlePrevPage, handleNextPage } = usePagination({ currentPage, totalPages });

    if (isLoading) return (
        <SkeletonLoader height={320} />
    )

    if (centers.length === 0) {
        return (
            <div className="text-center text-slate-500 dark:text-slate-400">
                No centers found
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-3 grid-cols-1">
            <div className="centers lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                    <thead className="">
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                Name
                            </th>
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                Location
                            </th>
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                Admin Name
                            </th>
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className=''>
                        {centers.map(center => (
                            <tr key={center._id} className='border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 duration-300'>
                                <TableCell center={center} />
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className='flex justify-between items-center p-6 text-sm text-slate-600 dark:text-slate-400'>
                    {/* Pagination */}
                    <p>Showing {start} to {end} of {totalCenters} centers</p>
                    <div className='flex gap-2 items-center'>
                        <button className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-300 ${currentPage === 1 || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={handlePrevPage}
                            disabled={currentPage === 1 || isLoading}>
                            <ChevronLeft />
                        </button>
                        <p>Page {currentPage} of {totalPages}</p>
                        <button className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-300 ${currentPage === totalPages || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || isLoading}>
                            <ChevronRight />
                        </button>
                    </div>
                </div>
            </div >
        </div >
    )
}
