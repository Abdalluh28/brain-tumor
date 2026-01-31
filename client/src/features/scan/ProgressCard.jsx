import { Progress } from "@/components/ui/progress";
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useScanProgress } from './useScanProgress';

export default function ProgressCard() {
    const [progressValue, setProgressValue] = useState(0);

    useScanProgress({ progressValue, setProgressValue });

    return (
        <div className='flex flex-col gap-4 shadow-md rounded-lg bg-white dark:bg-background dark:border dark:border-slate-700 p-4'>
            <div className='flex gap-2 items-center'>
                <LoaderCircle size={32} className="animate-spin text-primary" />
                <span>Processing 4-view MRI scan</span>
            </div>

            <div>
                <div className='flex justify-between items-center'>
                    <span>
                        {progressValue === 0 && 'Preprocessing MRI images...'}
                        {progressValue > 0 && progressValue <= 25 && 'Running neural network on all views...'}
                        {progressValue > 25 && progressValue <= 50 && 'Generating Grad-CAM visualizations...'}
                        {progressValue > 50 && progressValue <= 75 && 'Combining multi-view predictions...'}
                        {progressValue > 75 && 'Finalizing results...'}
                    </span>
                    <span>{progressValue}%</span>
                </div>

                <Progress value={progressValue} className="w-full h-2 rounded-full mt-2" />
            </div>
        </div>
    );
}
