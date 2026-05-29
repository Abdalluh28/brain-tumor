import { CircleCheckBig } from 'lucide-react';
import ProgressCard from './ProgressCard';
import { useCreateScan } from './useCreateScan';
import { useDispatch, useSelector } from 'react-redux';
import { clearFiles } from './scanSlice';
import toast from 'react-hot-toast';
import { useFormContext } from 'react-hook-form';

export default function StartAnalysisCard({ patientData }) {

    // trigger to validate form without submitting it
    const { trigger } = useFormContext();
    
    const { createScan, isLoading } = useCreateScan();
    const files = useSelector(state => state.scan.files);
    const dispatch = useDispatch();
    const is3DScan = patientData.scanType === '3D';

    const handleCreateScan = async () => {
        // validate patient info
        const isValid = await trigger([
            'patientName',
            'patientId',
            'patientAge',
            'patientGender',
            'patientPhone',
            'scanType',
        ])

        // show error message
        if (!isValid) {
            toast.error("Please fill in all patient information");
            return;
        }

        // all good, create scan
        createScan({ patientData, files }, {
            onSuccess: () => {
                dispatch(clearFiles());
            }
        });
    }

    if (isLoading) {
        return <ProgressCard />
    }

    return (
        <div className='flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-700 shadow-md rounded-lg p-4 '>
            <div className='flex gap-2 text-green-500 '>
                <CircleCheckBig />
                <p>All 4 {is3DScan ? '3D volume' : 'MRI image'} modalities validated successfully</p>
            </div>
            <div className='bg-primary/15 px-4 py-2 rounded-lg'>
                <p className='text-blue-900 dark:text-blue-100 font-semibold'>The system will analyze all 4 modalities and provide:</p>
                <ul className='flex flex-col gap-1 mt-2 ml-2 text-blue-800 dark:text-blue-200 text-[15px] list-inside'>
                    <li className='flex items-center gap-1'>
                        <span>•</span>
                        <span>Comprehensive tumor classification (HGG, LGG, Metastasis, or Healthy)</span>
                    </li>
                    <li className='flex items-center gap-1'>
                        <span>•</span>
                        <span>Confidence scoring and probability distribution</span>
                    </li>
                    <li className='flex items-center gap-1'>
                        <span>•</span>
                        <span>Visual explanation highlighting regions that influenced the result</span>
                    </li>
                </ul>
            </div>
            <button className='bg-primary rounded-xl p-4 text-white cursor-pointer hover:bg-primary-hover transition duration-300 text-lg'
                onClick={handleCreateScan}>
                Run Multi-Modality Classification Analysis
            </button>
        </div>
    )
}
