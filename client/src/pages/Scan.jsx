import ScanCards from '@/features/scan/ScanCards'
import ScanHeader from '@/features/scan/ScanHeader'
import UploadScanCard from '@/features/scan/components/upload/UploadScanCard'
import React from 'react'

export default function Scan() {
    return (
        <>
            <ScanHeader />
            <div className='flex flex-col gap-8 justify-center items-center mt-8 mb-16 mx-12'>
                <UploadScanCard />
                <ScanCards />
            </div>
        </>
    )
}
