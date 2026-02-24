import { LoaderCircle } from 'lucide-react'
import React from 'react'

export default function Spinner({ color = 'text-primary' }) {
    return (
        <LoaderCircle size={32} className={`animate-spin ${color}`} />
    )
}
