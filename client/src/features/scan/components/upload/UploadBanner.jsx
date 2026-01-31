import { CircleAlert, CircleCheckBig } from 'lucide-react'
import React from 'react'

export default function UploadBanner({ uploadedSlots, emptySlots }) {
    return (
        <div className={`scan flex gap-2 items-center shadow-md p-4 rounded-lg 
                ${uploadedSlots === 0 ? 'border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : uploadedSlots < 4 ? 'border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>

            {/* Status Icon */}
            <div className={`${uploadedSlots < 4 ? 'text-primary' : 'text-green-500'}`}>
                {uploadedSlots < 4 ? (
                    <CircleAlert size={28} />
                ) : (
                    <CircleCheckBig size={28} />
                )}
            </div>

            {/* Status Text */}
            <div className='flex flex-col gap-2'>
                <p className='text-lg text-blue-900 dark:text-blue-100'>
                    {uploadedSlots === 0 ? 'Upload 4 MRI views to begin analysis' :
                        uploadedSlots < 4 ? `${uploadedSlots} / 4 images uploaded - ${emptySlots} more required` : `All ${uploadedSlots} images uploaded - Ready for classification`}
                </p>
                <p className='text-sm text-slate-700 dark:text-slate-300'>Multi-view analysis improves accuracy and provides comprehensive tumor assessment</p>
            </div>
        </div>
    )
}
