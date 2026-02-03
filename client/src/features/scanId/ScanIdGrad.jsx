import React from 'react'
import gradCamImage from '@/assets/grad_cam_test.png'

export default function ScanIdGrad() {
    return (
        <div className='flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl'>
            <div className='flex justify-between'>
                <div className='flex flex-col gap-2'>
                    <p className='font-semibold text-xl'>Grad-CAM Heatmap</p>
                    <p>Areas of interest highlighted by the AI model</p>
                </div>
                <div className='flex gap-2'>
                    <ImageKey text='Low' color='bg-blue-500' />
                    <ImageKey text='Med' color='bg-yellow-500' />
                    <ImageKey text='High' color='bg-red-500' />
                </div>
            </div>
            <div className='rounded-lg p-4 flex justify-center items-center'>
                <img
                    src={gradCamImage}
                    alt="Grad-CAM Heatmap"
                    className="max-h-105 w-auto object-contain rounded-md shadow-sm"
                />
            </div>
            <div className='px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'>
                The heatmap shows regions that contributed most to the Healthy classification. Red areas indicate highest activation, while blue areas show lower activation.
            </div>
        </div>
    )
}

function ImageKey({ text, color }) {
    return (
        <div className="flex items-center gap-2">
            <span className={`${color} w-4 h-4 rounded`}></span>
            <p>{text}</p>
        </div>

    );
}