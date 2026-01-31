import { CircleCheckBig } from 'lucide-react'
import React, { useState } from 'react'
import ProgressCard from './ProgressCard'

export default function StartAnalysisCard() {

    // TODO: Add functionality to button to start analysis process
    const [startAnalysis, setStartAnalysis] = useState(false)

    if (startAnalysis) {
        return <ProgressCard />
    }

    return (
        <div className='flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-700 shadow-md rounded-lg p-4 '>
            <div className='flex gap-2 text-green-500 '>
                <CircleCheckBig />
                <p>All 4 MRI views validated successfully</p>
            </div>
            <div className='bg-primary/15 px-4 py-2 rounded-lg'>
                <p className='text-blue-900 dark:text-blue-100 font-semibold'>The AI model will analyze all 4 views and provide:</p>
                <ul className='flex flex-col gap-1 mt-2 ml-2 text-blue-800 dark:text-blue-200 text-[15px] list-inside'>
                    <li className='flex items-center gap-1'>
                        <span>•</span>
                        <span>Comprehensive tumor classification (GBM, LGG, Metastasis, or Healthy)</span>
                    </li>
                    <li className='flex items-center gap-1'>
                        <span>•</span>
                        <span>Multi-view confidence scoring and probability distribution</span>
                    </li>
                    <li className='flex items-center gap-1'>
                        <span>•</span>
                        <span>Grad-CAM visualizations for each MRI view</span>
                    </li>
                    <li className='flex items-center gap-1'>
                        <span>•</span>
                        <span>Cross-view consistency analysis</span>
                    </li>
                </ul>
            </div>
            <button className='bg-primary rounded-xl p-4 text-white cursor-pointer hover:bg-primary-hover transition duration-300 text-lg'
                onClick={() => setStartAnalysis(true)}>
                Run Multi-View Classification Analysis
            </button>
        </div>
    )
}
