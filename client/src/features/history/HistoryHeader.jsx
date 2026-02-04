import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function HistoryHeader() {

    const navigate = useNavigate()

    return (
        <div className='bg-white dark:bg-background dark:border-b dark:border-b-slate-600 flex justify-between items-center p-6 shadow-md flex-wrap gap-4'>
            <div className='flex flex-col gap-1'>
                <p className='text-3xl font-semibold'>Scan History</p>
                <p className=' text-slate-600 dark:text-slate-400'>View and manage all previous MRI scans and classifications</p>
            </div>
            <button className='bg-primary px-6 py-2 rounded-lg text-white text-lg cursor-pointer hover:bg-primary-hover transition duration-300'
                onClick={() => navigate('/scan')}>
                Upload New Scan
            </button>
        </div>
    )
}
