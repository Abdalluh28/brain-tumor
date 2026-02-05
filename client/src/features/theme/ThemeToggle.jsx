import { Moon, Sun } from 'lucide-react';
import React from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from './ThemeSlice';

export default function ThemeToggle() {
    const theme = useSelector(state => state.theme.mode);
    const dispatch = useDispatch();

    const handleToggle = () => {
        dispatch(toggleTheme());
    };


    return (
        <button className='rounded-xl cursor-pointer p-2 text-sidebar-foreground bg-sidebar-theme-toggle hover:bg-sidebar-theme-toggle-hover dark:bg-sidebar-theme-toggle transition duration-300'
            onClick={handleToggle}>
            {theme === 'light' ? <Moon /> : <Sun />}
        </button>
    )
}
