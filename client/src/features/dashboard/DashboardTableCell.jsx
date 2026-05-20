import { CircleAlert, CircleCheckBig, CircleEllipsis } from 'lucide-react';
import React from 'react'

export default function DashboardTableCell({ data }) {

    const predictionColors = {
        Healthy: 'bg-green-100 text-green-700',
        HGG: 'bg-red-100 text-red-700',
        LGG: 'bg-yellow-100 text-yellow-700',
        Metastasis: 'bg-purple-100 text-purple-700',
        Others: 'bg-blue-100 text-blue-700',
    };

    const date = new Date(data.createdAt);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100'>{data._id}</td>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100'>{data.radiologist}</td>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100 hidden md:table-cell'>{formattedDate} {formattedTime}</td>
            <td className={`py-3 px-2`}>
                <span className={`px-2 py-1 text-sm rounded-lg ${predictionColors[data.prediction]}`}>{data.prediction}</span>
            </td>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100'>{data.confidence}%</td>
            <td className='py-3 px-2 text-slate-800 dark:text-slate-100'>
                {data.status === "completed" && (
                    <span className='text-green-500' title='Completed'>
                        <CircleCheckBig />
                    </span>
                )}
                {data.status === "pending" && (
                    <span className='text-red-500' title='Pending'>
                        <CircleAlert />
                    </span>
                )}
                {data.status === "review" && (
                    <span className='text-yellow-500' title='Review'>
                        <CircleEllipsis />
                    </span>
                )}
            </td>
        </>
    )
}
