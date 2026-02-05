import DashboardCards from '@/features/dashboard/DashboardCards'
import DashboardCharts from '@/features/dashboard/DashboardCharts'
import DashboardHeader from '@/features/dashboard/DashboardHeader'
import DashboardTable from '@/features/dashboard/DashboardTable'
import React from 'react'

export default function Dashboard() {
    return (
        <>
            <DashboardHeader />
            <DashboardCards />
            <DashboardCharts />
            <div className='grid lg:grid-cols-3 grid-cols-1'>
                <DashboardTable />
            </div>
        </>
    )
}
