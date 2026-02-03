import { Download, FileText } from 'lucide-react';

export default function ScanIdHeader({ scanId, date, time }) {


    return (
        <div className='bg-white dark:bg-background dark:border-b dark:border-b-slate-600 flex justify-between items-center p-6 shadow-md flex-wrap gap-4'>
            <div className='flex flex-col gap-2'>
                <p className='text-2xl font-semibold'>
                    Classification Results
                </p>
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                    Scan ID: {scanId} • Processed on {date} at {time}
                </p>
            </div>
            <div className='flex gap-4'>
                <button className='flex items-center justify-center gap-2 px-5 py-3 bg-gray-200 cursor-pointer rounded-2xl hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors duration-300'>
                    <FileText />
                    <span>View Report</span>
                </button>
                <button className='flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white cursor-pointer rounded-2xl hover:bg-primary-hover transition-colors duration-300'>
                    <Download />
                    <span>Download</span>
                </button>
            </div>
        </div>
    )
}
