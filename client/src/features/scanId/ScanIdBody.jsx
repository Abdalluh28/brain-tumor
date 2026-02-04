import React from 'react'
import ScanIdResult from './ScanIdResult'
import { data } from '@/data'
import ScanIdHeader from './ScanIdHeader'
import ScanIdMRI from './ScanIdMRI'
import ScanIdGrad from './ScanIdGrad'
import ScanIdProbabilities from './ScanIdProbabilities'
import ScanIdFooter from './ScanIdFooter'

export default function ScanIdBody() {

    // TODO: Get the predicted classification from the backend and display it here
    // think about using the loader functionality from router 6 for this
    // to render the UI in the pages folder (I don't know this will work or not yet)
    const scanResult = data[0]
    const {
        scanId,
        patientId,
        date,
        time,
        modelVersion,
        processedTimeMs,
        probabilities,
        prediction,
        confidence,
        status,
    } = scanResult

    return (
        <>
            <ScanIdHeader scanId={scanId} date={date} time={time} />
            <div className='scan flex flex-col lg:grid lg:grid-cols-3 gap-8 m-8'>
                <ScanIdResult
                    prediction={prediction}
                    confidence={confidence}
                    modelVersion={modelVersion}
                    processedTimeMs={processedTimeMs}
                />
                <div className='flex flex-col lg:col-span-2'>
                    <ScanIdMRI />
                    <ScanIdGrad />
                </div>
                <div className='col-span-1'>
                    <ScanIdProbabilities
                        confidence={confidence}
                        prediction={prediction}
                        probabilities={probabilities}
                        scanId={scanId}
                        patientId={patientId}
                        date={date}
                        time={time}
                        status={status} />
                </div>
                <div className='lg:col-span-3'>
                    <ScanIdFooter />
                </div>
            </div>
        </>
    )
}
