import React from 'react'
import AppSidebar from '@/components/AppSidebar'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export default function AppLayout() {
    return (
        <div className="flex min-h-screen">
            <AppSidebar />

            <main className="flex-1 p-6">
                <div className='block md:hidden'>
                    <SidebarTrigger>
                        <Menu />
                    </SidebarTrigger>
                </div>
                <Outlet />
            </main>
        </div>
    )
}
