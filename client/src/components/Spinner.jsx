import { LoaderCircle } from 'lucide-react'
import React from 'react'

export default function Spinner({ color = 'text-primary', align = 'center' }) {
    return (
        <div className={`w-full h-full flex items-center justify-${align}`}>
            <LoaderCircle size={32} className={`animate-spin ${color}`} />
        </div>
    )
}
