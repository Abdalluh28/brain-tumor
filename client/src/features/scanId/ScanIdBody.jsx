import Spinner from '@/components/Spinner'
import { useParams } from 'react-router-dom'
import ScanIdFooter from './ScanIdFooter'
import ScanIdGrad from './ScanIdGrad'
import ScanIdHeader from './ScanIdHeader'
import ScanIdMRI from './ScanIdMRI'
import ScanIdProbabilities from './ScanIdProbabilities'
import ScanIdResult from './ScanIdResult'
import { useScan } from './useScan'

export default function ScanIdBody() {

    const params = useParams();
    const scanId = params.scanId;
    const { scan, isLoading } = useScan({ id: scanId });
    // still need to get the images properly
    const {
        prediction,
        confidenceScores,
        confidence,
        gradCamPath,
        radiologist,
        status,
        createdAt,
        modelVersion,
        processedTime,
    } = scan || {};
    const date = new Date(createdAt).toLocaleDateString();
    const time = new Date(createdAt).toLocaleTimeString();

    if (isLoading) {
        return <Spinner />
    }

    return (
        <>
            <ScanIdHeader scanId={scanId} date={date} time={time} />
            <div className='scan flex flex-col lg:grid lg:grid-cols-3 gap-8 m-8'>
                <ScanIdResult
                    prediction={prediction}
                    confidence={confidence}
                    modelVersion={modelVersion}
                    processedTimeMs={processedTime}
                />
                <div className='flex flex-col lg:col-span-2'>
                    <ScanIdMRI originalMRI={gradCamPath} />
                    <ScanIdGrad gradCamPath={gradCamPath} />
                </div>
                <div className='col-span-1'>
                    <ScanIdProbabilities
                        confidence={confidence}
                        prediction={prediction}
                        confidenceScores={confidenceScores}
                        scanId={scanId}
                        radiologist={radiologist}
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
