import React, { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useMonthDistribution } from './useMonthDistribution';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function LineChart() {
    const [darkMode, setDarkMode] = useState(
        document.documentElement.classList.contains("dark")
    );

    const { data, isLoading } = useMonthDistribution();

    // ✅ Prepare chart data from API
    const labels = data?.map(item => {
        const date = new Date(item.year, item.month - 1);
        return date.toLocaleString("default", {
            month: "short",
            year: "numeric",
        });
    }) || [];

    const values = data?.map(item => item.count) || [];

    // Listen for dark mode changes
    useEffect(() => {
        const root = document.documentElement;

        const observer = new MutationObserver(() => {
            setDarkMode(root.classList.contains("dark"));
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const chartData = {
        labels,
        datasets: [
            {
                label: "Scans Count",
                data: values,
                fill: true, // fill the area under the line
                borderColor: "#155dfc", // line color
                backgroundColor: "rgba(21, 93, 252, 0.2)", // shadow/fill color
                tension: 0.4, // smooth curve
                pointBackgroundColor: "#155dfc", // points color
                pointBorderColor: "#155dfc",
                pointHoverBackgroundColor: "#155dfc",
                pointHoverBorderColor: "#155dfc",
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: darkMode ? "#1f2937" : "#ffffff",
                titleColor: darkMode ? "#ffffff" : "#111827",
                bodyColor: darkMode ? "#ffffff" : "#111827",
                borderColor: "#155dfc",
                borderWidth: 1,

                callbacks: {
                    title: (tooltipItems) => {
                        return tooltipItems[0].label; // "Mar 2026"
                    },
                    label: (context) => {
                        return `Scans: ${context.raw}`; // "Scans: 5"
                    }
                }
            },
        },
        interaction: {
            mode: "index",
            intersect: false,
        },
        scales: {
            x: {
                ticks: {
                    color: darkMode ? "#e5e7eb" : "#374151",
                },
                grid: {
                    color: darkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    color: darkMode ? "#e5e7eb" : "#374151",
                },
                grid: {
                    color: darkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                },
            },
        },
    };


    // ✅ Loading state
    if (isLoading) {
        return (
            <SkeletonLoader height={320} />
        );
    }

    return (
        <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col">
            <h1 className="text-xl font-bold mb-4">Monthly Scan Volume</h1>
            <div className="relative w-full h-80">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}