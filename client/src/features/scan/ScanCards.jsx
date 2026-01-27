import { CircleCheckBig, Image, LoaderCircle } from 'lucide-react'
import React from 'react'

export default function ScanCards() {
    return (
        <div className='flex flex-col lg:flex-row items-stretch gap-8 '>
            <div className='w-full lg:w-1/3 bg-white shadow-md rounded-lg px-4 py-6 flex flex-col gap-2 dark:bg-background border border-slate-200 dark:border-slate-800 '>
                <span className='text-primary '>
                    <Image size={32} />
                </span>
                <p className='font-semibold text-xl'>Multi-View Analysis</p>
                <p className='text-slate-600 dark:text-slate-400'>4-view analysis achieves 98.2% accuracy by combining axial, sagittal, and coronal perspectives</p>
            </div>
            <div className='w-full lg:w-1/3 bg-white shadow-md rounded-lg px-4 py-6 flex flex-col gap-2 dark:bg-background border border-slate-200 dark:border-slate-800 '>
                <span className='text-primary '>
                    <LoaderCircle size={32} />
                </span>
                <p className='font-semibold text-xl'>Fast Processing</p>
                <p className='text-slate-600 dark:text-slate-400'>All views processed simultaneously with results in under 15 seconds</p>
            </div>
            <div className='w-full lg:w-1/3 bg-white shadow-md rounded-lg px-4 py-6 flex flex-col gap-2 dark:bg-background border border-slate-200 dark:border-slate-800 '>
                <span className='text-primary '>
                    <CircleCheckBig size={32} />
                </span>
                <p className='font-semibold text-xl'>Explainable AI</p>
                <p className='text-slate-600 dark:text-slate-400'>Grad-CAM heatmaps for each view show which areas influenced the decision</p>
            </div>
        </div>
    )
}
