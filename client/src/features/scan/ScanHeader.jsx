import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tally3 } from 'lucide-react'

export default function ScanHeader() {
    return (
        <div className='bg-white dark:bg-background dark:border-b dark:border-b-slate-600 flex justify-between items-center p-6 shadow-md flex-wrap gap-4'>
            <div className='flex gap-2'>
                <div className="md:hidden -translate-x-2">
                    <SidebarTrigger>
                        <Tally3 className="h-5! w-5! rotate-90" />
                    </SidebarTrigger>
                </div>
                <div className='flex flex-col gap-2'>
                    <h1 className='text-2xl font-bold'>Upload MRI Scan</h1>
                    <p className='text-slate-600 dark:text-slate-400'>Upload a brain MRI scan for AI-powered tumor classification</p>
                </div>
            </div>
        </div>
    )
}
