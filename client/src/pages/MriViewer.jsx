import MriViewerPanel from '@/features/mri-viewer/MriViewerPanel';
import { Eye } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tally3 } from 'lucide-react';

export default function MriViewer() {
    return (
        <>
            {/* Header */}
            <div className='bg-white dark:bg-background dark:border-b dark:border-b-slate-600 flex justify-between items-center p-6 shadow-md flex-wrap gap-4'>
                <div className='flex gap-2'>
                    <div className="md:hidden -translate-x-2">
                        <SidebarTrigger>
                            <Tally3 className="h-5! w-5! rotate-90" />
                        </SidebarTrigger>
                    </div>
                    <div className='flex flex-col gap-2'>
                        <h1 className='text-3xl font-semibold flex items-center gap-2'>
                            <Eye className="w-8 h-8 text-primary" />
                            BraTS Multi-Modality MRI Viewer
                        </h1>
                        <p className='text-slate-600 dark:text-slate-400'>
                            Load a patient case and visualize co-registered T1, T1ce, T2, and FLAIR 3D volumes
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className='w-full max-w-[1600px] flex flex-col gap-8 justify-center items-center mt-8 mb-16 px-4 md:px-12'>
                <MriViewerPanel />
            </div>
        </>
    );
}
