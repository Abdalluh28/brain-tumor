import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tally3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DashboardHeader() {

    const navigate = useNavigate()

    return (
        <div className='bg-white dark:bg-background dark:border-b dark:border-b-slate-600 flex justify-between items-center p-6 shadow-md flex-wrap gap-4'>
            <div className='flex gap-2'>
                <div className="md:hidden -translate-x-2">
                    <SidebarTrigger>
                        <Tally3 className="h-5! w-5! rotate-90" />
                    </SidebarTrigger>
                </div>
                <div className='flex flex-col gap-2'>
                    <h1 className='text-3xl font-semibold'>Dashboard</h1>
                    <p className='text-slate-600 dark:text-slate-400'>Overview of your AI diagnostic system</p>
                </div>
            </div>
            <div>
                <button className='bg-blue-600 hover:bg-blue-700 transition duration-300 hover:cursor-pointer text-white px-6 py-2 rounded-xl text-lg'
                    onClick={() => navigate('/scan')}>
                    Upload New Scan
                </button>
            </div>
        </div>
    )
}
