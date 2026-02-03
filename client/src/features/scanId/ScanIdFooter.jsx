import React from 'react'

export default function ScanIdFooter() {



    return (
        <div className='flex flex-col gap-6 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 rounded-xl shadow-md'>
            <p className='text-xl font-semibold'>Classification Reference</p>
            <div className='flex gap-6 flex-col lg:flex-row '>
                <Card
                    title="Healthy"
                    text="No tumor detected in the brain tissue"
                    color='text-scan-header-healthy-text'
                    bg='bg-scan-header-healthy-bg' />

                <Card
                    title="LGG"
                    text="Low-Grade Glioma - slower growing tumor"
                    color='text-scan-header-lgg-text'
                    bg='bg-scan-header-lgg-bg' />
                <Card
                    title="GBM"
                    text="Glioblastoma - aggressive malignant tumor"
                    color='text-scan-header-gbm-text'
                    bg='bg-scan-header-gbm-bg' />
                <Card
                    title="Metastasis"
                    text="Cancer spread from another body part"
                    color='text-scan-header-metastasis-text'
                    bg='bg-scan-header-metastasis-bg' />
            </div>
        </div>
    )
}

const Card = ({ title, text, color, bg }) => {
    return (
        <div className={`flex flex-col p-4 rounded-xl ${bg ?? ''} ${color ?? ''}`}>
            <p className='font-semibold'>{title}</p>
            <p className='text-sm'>{text}</p>
        </div>
    )
}
