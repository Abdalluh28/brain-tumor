import { PREDICTION_CONFIG } from '@/config/predictionConfig'
import { TrendingUp } from 'lucide-react'
import React from 'react'
import { Progress } from "@/components/ui/progress"
export default function ScanIdProbabilities({ confidence, prediction, probabilities, scanId, patientId, date, time, status }) {

    const key = prediction.toLowerCase()
    const config = PREDICTION_CONFIG[key] || {}


    return (
        <div className='flex flex-col gap-4'>
            {/* Confidence Score */}
            <div className='flex flex-col items-center gap-4 bg-white dark:bg-background p-5 rounded-xl shadow-md border border-slate-200 dark:border-slate-600'>
                <p className='self-start text-xl font-semibold'>Confidence Score</p>
                <div
                    className="w-38 h-38 rounded-full flex items-center justify-center"
                    style={{
                        background: `conic-gradient(${config.color} ${confidence}%, #e5e7eb 0)`
                    }}
                >
                    <div className="w-33 h-33 bg-white dark:bg-background rounded-full flex items-center justify-center">
                        <span className="font-semibold text-2xl">{confidence}%</span>
                    </div>
                </div>
                <div className='flex gap-3'>
                    <span className={config.textColor}>
                        <TrendingUp />
                    </span>
                    <p className='text-sm'>High confidence prediction</p>
                </div>
            </div>

            {/* Probabilities */}
            <div className='flex flex-col gap-4 bg-white dark:bg-background p-5 rounded-xl shadow-md border border-slate-200 dark:border-slate-600'>
                <p>All Class Probabilities</p>
                {Object.entries(probabilities).map(([label, prob]) => {
                    prob = (prob * 100).toFixed(2)
                    return (
                        <div key={label} className='flex flex-col gap-2'>
                            <div className='flex justify-between'>
                                <p>{label}</p>
                                <p>{prob}%</p>
                            </div>
                            <Progress value={prob} className='bg-slate-100 dark:bg-slate-700' />
                        </div>
                    )
                })}
            </div>

            {/* scan details */}
            <div className='flex flex-col gap-3 bg-white dark:bg-background p-5 rounded-xl shadow-md border border-slate-200 dark:border-slate-600'>
                <p className='text-xl font-semibold'>Scan Details</p>
                <div className='flex flex-col '>
                    <span className='text-sm text-slate-500'>Scan ID</span>
                    <p>{scanId}</p>
                </div>
                <div className='flex flex-col '>
                    <span className='text-sm text-slate-500'>Patient ID</span>
                    <p>{patientId}</p>
                </div>
                <div className='flex flex-col '>
                    <span className='text-sm text-slate-500'>Date & Time</span>
                    <p>{date} {time}</p>
                </div>
                <div className='flex flex-col '>
                    <span className='text-sm text-slate-500'>Status</span>
                    <p className={` w-fit px-2 py-1 rounded-full mt-1
                        ${status === 'completed' ? 'text-green-600 bg-green-200' : 'text-red-600 bg-red-200'}`}>
                        {status}
                    </p>
                </div>
            </div>
        </div>
    )
}
