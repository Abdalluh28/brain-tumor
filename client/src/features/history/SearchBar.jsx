import { Search } from 'lucide-react'
import React from 'react'

export default function SearchBar() {
    return (
        <div className='lg:col-span-2 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl'>
            <Search className='text-slate-600 dark:text-slate-400' />
            <input type="text"
                placeholder='Search By Scan ID or Patient ID'
                className='w-full outline-none border-none bg-slate-100 dark:bg-slate-800 p-1' />
        </div>
    )
}
