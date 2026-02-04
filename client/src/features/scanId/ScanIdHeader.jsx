import { Download, FileText } from 'lucide-react';

export default function ScanIdHeader({ scanId, date, time }) {


    return (
        <div className='bg-white dark:bg-background dark:border-b dark:border-b-slate-600 flex flex-col gap-2 p-6 shadow-md flex-wrap gap-4'>
            <p className='text-2xl font-semibold'>
                Classification Results
            </p>
            <p className='text-sm text-slate-500 dark:text-slate-400'>
                Scan ID: {scanId} • Processed on {date} at {time}
            </p>
        </div>
    )
}
