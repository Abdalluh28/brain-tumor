import { ChevronLeft, ChevronRight } from "lucide-react";
import DoctorsTableCell from "./DoctorsTableCell";
import { useGetMyDoctors } from "./services/useGetMyDoctors";
import { useGetAvailableDoctors } from "./services/useGetAvailableDoctors";
import { usePagination } from "@/hooks/usePagination";
import SkeletonLoader from "@/components/SkeletonLoader";

export default function DoctorsTable({ invitePage = false }) {

    const {
        doctors: myDoctors,
        currentPage: currentPageDoctors,
        totalPages: totalPagesDoctors,
        totalDoctors: totalDoctors,
        start: startDoctors,
        end: endDoctors,
        isLoading: isLoadingDoctors
    } = useGetMyDoctors();
    const {
        doctors: availableDoctors,
        currentPage: currentPageAvailable,
        totalPages: totalPagesAvailable,
        totalDoctors: totalAvailableDoctors,
        start: startAvailable,
        end: endAvailable,
        isLoading: isLoadingAvailable
    } = useGetAvailableDoctors();


    const doctors = invitePage ? availableDoctors : myDoctors;
    const currentPage = invitePage ? currentPageAvailable : currentPageDoctors;
    const totalPages = invitePage ? totalPagesAvailable : totalPagesDoctors;
    const total = invitePage ? totalAvailableDoctors : totalDoctors;
    const start = invitePage ? startAvailable : startDoctors;
    const end = invitePage ? endAvailable : endDoctors;
    const isLoading = invitePage ? isLoadingAvailable : isLoadingDoctors;


    const { handlePrevPage, handleNextPage } = usePagination({ currentPage, totalPages });

    if (isLoading) return (
        <SkeletonLoader height={320} />
    )

    return (
        <div className="grid lg:grid-cols-3 grid-cols-1">
            <div className="doctors lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                    <thead className="">
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                Name
                            </th>
                            {invitePage ? (
                                <>
                                    <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                        Experience
                                    </th>
                                    <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                        Radiology Center
                                    </th>
                                </>
                            ) : (
                                <>
                                    <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                        Joined Date
                                    </th>
                                    <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                        Status
                                    </th>
                                    <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                        Scan Count
                                    </th>
                                </>
                            )}
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className=''>
                        {doctors.map(doctor => (
                            <tr key={doctor._id} className='border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 duration-300'>
                                <DoctorsTableCell doctor={doctor} invitePage={invitePage} />
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className='flex justify-between items-center p-6 text-sm text-slate-600 dark:text-slate-400'>
                    {/* Pagination */}
                    <p>Showing {start} to {end} of {total} doctors</p>
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
