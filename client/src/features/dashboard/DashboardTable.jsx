import React from 'react'
import { data } from '@/data'
import { getRecentData } from '@/utils/getRecentData'
import { Link, useNavigate } from 'react-router-dom';
import DashboardTableCell from './DashboardTableCell';
export default function DashboardTable() {

    const recentData = getRecentData(data);
    const navigate = useNavigate();

    return (
        <div className='bg-white shadow rounded-lg p-4 m-4 dark:bg-gray-800 lg:col-span-3'>
            <div className="flex justify-between items-center">
                <p className='text-xl font-semibold'>Recent Scans</p>
                <button className='bg-primary text-white px-4 py-2 rounded-lg text-lg hover:bg-primary/90 transition duration-300 hover:cursor-pointer'
                    onClick={() => navigate('/history')}>View All</button>
            </div>
            <div className='mt-4 overflow-x-auto'>
                <table className="w-full table-auto border-collapse">
                    <thead className='border-b border-slate-200 dark:border-slate-700'>
                        <tr className='text-left text-slate-600 dark:text-slate-400'>
                            <th className='py-3 px-2 font-medium'>Scan ID</th>
                            <th className='py-3 px-2 font-medium'>Patient</th>
                            <th className='py-3 px-2 font-medium hidden md:table-cell'>Date & Time</th>
                            <th className='py-3 px-2 font-medium'>Prediction</th>
                            <th className='py-3 px-2 font-medium'>Confidence</th>
                            <th className='py-3 px-2 font-medium'>Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
                        {recentData.map(item => (
                            <tr
                                key={item.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-700 transition hover:cursor-pointer duration-300"
                            >
                                <DashboardTableCell data={item} />
                            </tr>
                        ))}
                    </tbody>

                </table>
            </div>
        </div>
    )
}
