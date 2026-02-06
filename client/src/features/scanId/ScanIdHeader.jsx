import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tally3 } from "lucide-react";

export default function ScanIdHeader({ scanId, date, time }) {


    return (
        <div className='bg-white dark:bg-background dark:border-b dark:border-b-slate-600 flex p-6 shadow-md flex-wrap gap-4'>
            <div className='flex gap-2'>
                <div className="md:hidden -translate-x-2">
                    <SidebarTrigger>
                        <Tally3 className="h-5! w-5! rotate-90" />
                    </SidebarTrigger>
                </div>
                <div className="flex flex-col gap-1">
                    <p className='text-3xl font-semibold'>
                        Classification Results
                    </p>
                    <p className='text-sm text-slate-500 dark:text-slate-400'>
                        Scan ID: {scanId} • Processed on {date} at {time}
                    </p>
                </div>
            </div>
        </div>
    )
}
