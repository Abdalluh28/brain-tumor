import Spinner from '@/components/Spinner'
import { useParams } from 'react-router-dom'
import ScanIdFooter from './ScanIdFooter'
import ScanIdSegmentation from './ScanIdSegmentation'
import ScanIdXai from './ScanIdXai'
import ScanIdHeader from './ScanIdHeader'
import ScanIdMRI from './ScanIdMRI'
import ScanIdProbabilities from './ScanIdProbabilities'
import ScanIdFullCase from './ScanIdFullCase'
import ScanIdResult from './ScanIdResult'
import { useScan } from './useScan'
import SkeletonLoader from '@/components/SkeletonLoader'

export default function ScanIdBody() {

    const params = useParams();
    const scanId = params.scanId;
    const { scan, isLoading } = useScan({ id: scanId });
    const {
        prediction,
        confidenceScores,
        confidence,
        gradCamPath,
        xai,
        xaiError,
        segmentation,
        fullCase,
        scanType,
        radiologist,
        status,
        createdAt,
        processedTime,
        files,
    } = scan || {};
    const date = new Date(createdAt).toLocaleDateString();
    const time = new Date(createdAt).toLocaleTimeString();

    if (isLoading) {
        return <SkeletonLoader height={400} />
    }

    return (
        <>
            {/* scan prop enables report download / print in the header */}
            <ScanIdHeader scanId={scanId} date={date} time={time} scan={scan} />
            <div className='scan flex flex-col lg:grid lg:grid-cols-3 gap-8 m-8'>
                <ScanIdResult
                    prediction={prediction}
                    confidence={confidence}
                    processedTimeMs={processedTime}
                    fullCase={fullCase}
                    scanType={scanType}
                />
                <div className='flex flex-col lg:col-span-2 gap-6'>
                    {fullCase ? <ScanIdFullCase fullCase={fullCase} /> : null}
                    <ScanIdMRI
                        originalMRI={
                            xai?.stages?.[0]?.originalPath
                            || xai?.originalPath
                            || gradCamPath
                        }
                        files={files}
                    />
                    {scanType !== '3D' ? (
                        <ScanIdXai scanId={scanId} xai={xai} xaiError={xaiError} />
                    ) : null}
                    {segmentation ? (
                        <ScanIdSegmentation segmentation={segmentation} />
                    ) : null}
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
