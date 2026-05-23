import React from 'react'

export default function ScanIdGrad({ gradCamPath }) {
    return (
        <div className='flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 shadow-md rounded-xl'>
            <div className='flex justify-between'>
                <div className='flex flex-col gap-2'>
                    <p className='font-semibold text-xl'>Reference MRI</p>
                    <p>Uploaded scan preview when segmentation is not available</p>
                </div>
                <div className='flex gap-2'>
                    <ImageKey text='Low' color='bg-blue-500' />
                    <ImageKey text='Med' color='bg-yellow-500' />
                    <ImageKey text='High' color='bg-red-500' />
                </div>
            </div>
            <div className='rounded-lg p-4 flex justify-center items-center'>
                <img
                    src={gradCamPath}
                    alt="Grad-CAM Heatmap"
                    className="max-h-105 w-auto object-contain rounded-md shadow-sm"
                />
            </div>
            <div className='px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'>
                Segmentation is only generated for HGG, LGG, and Metastasis predictions.
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