import DashboardCards from '@/features/dashboard/DashboardCards'
import DashboardCharts from '@/features/dashboard/DashboardCharts'
import DashboardHeader from '@/features/dashboard/DashboardHeader'
import React from 'react'

export default function Dashboard() {
    return (
        <>
            <DashboardHeader />
            <DashboardCards />
            <DashboardCharts />
        </>
    )
}
