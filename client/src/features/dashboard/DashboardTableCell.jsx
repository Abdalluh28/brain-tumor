import { CircleAlert, CircleCheckBig } from 'lucide-react';
import React from 'react'

export default function DashboardTableCell({ data }) {

    const predictionColors = {
        Healthy: 'bg-green-100 text-green-700',
        GBM: 'bg-red-100 text-red-700',
        LGG: 'bg-yellow-100 text-yellow-700',
        Metastasis: 'bg-purple-100 text-purple-700',
    };

    return (
        <>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100'>{data.scanId}</td>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100'>{data.patientName}</td>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100 hidden md:table-cell'>{data.date} {data.time}</td>
            <td className={`py-3 px-2`}>
                <span className={`px-2 py-1 text-sm rounded-lg ${predictionColors[data.prediction]}`}>{data.prediction}</span>
            </td>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100'>{data.confidence}%</td>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100'>
                {data.status === "completed" ? (
                    <span className='text-green-500' title='Completed'>
                        <CircleCheckBig />
                    </span>
                ) : (
                    <span className='text-red-500' title='Review'>
                        <CircleAlert />
                    </span>
                )}
            </td>
        </>
    )
}
