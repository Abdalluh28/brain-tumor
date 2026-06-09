import { ChevronLeft, ChevronRight } from "lucide-react";
import DoctorsTableCell from "./DoctorsTableCell";

export default function DoctorsTable({ invitePage = false }) {

    const doctors = [
        {
            name: "Dr. John Doe",
            specialization: "Cardiologist",
            updatedAt: "2022-01-01",
            status: "Active",
            scanCount: 10,
            id: 1,
            email: "Lb5rO@example.com",
        },
        {
            name: "Dr. Jane Doe",
            specialization: "Dentist",
            updatedAt: "2022-01-01",
            status: "Active",
            scanCount: 10,
            id: 2,
            email: "Lb5rO@example.com",
        },
    ]

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full table-auto">
                    <thead className="">
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                Name
                            </th>
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell text-left">
                                Specialization
                            </th>
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 hidden lg:table-cell text-left">
                                Joined Date
                            </th>
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-left">
                                Status
                            </th>
                            <th className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 hidden sm:table-cell text-left">
                                Scan Count
                            </th>
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
                    <p>Showing 1 to 10 of 100 doctors</p>
                    <div className='flex gap-2 items-center'>
                        <button className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-300 cursor-pointer`}
                            >
                            <ChevronLeft />
                        </button>
                        <p>Page 1 of 10</p>
                        <button className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-300 opacity-50 cursor-not-allowed`}
                            >
                            <ChevronRight />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
