import { Moon, Sun } from 'lucide-react';
import React from 'react'

export default function ThemeToggle() {
    const theme = 'light';


    return (
        <button className='rounded-xl p-2 bg-slate-200 hover:bg-slate-300 transition duration-300'>
            {theme === 'light' ? <Moon /> : <Sun />}
        </button>
    )
}
