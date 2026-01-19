import React, { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'

import { data } from '../../data'
import { getLastMonthsData } from '@/utils/getLastMonthsData';

export default function LineChart() {
    const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));
    const lastMonthsData = getLastMonthsData(data, 4);

    // Count scans per month
    const scansPerMonth = {};

    lastMonthsData.forEach(item => {
        const month = new Date(item.date).toLocaleString("default", {
            month: "short",
            year: "numeric",
        });

        scansPerMonth[month] = (scansPerMonth[month] || 0) + 1;
    });

    const months = Object.keys(scansPerMonth);

    // Sort months chronologically
    const sortedMonths = months.sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');

        const dateA = new Date(`${monthA} 1, ${yearA}`);
        const dateB = new Date(`${monthB} 1, ${yearB}`);

        return dateA - dateB;
    });

    const labels = sortedMonths;
    const values = sortedMonths.map(month => scansPerMonth[month]);

    // Listen for dark mode changes
    useEffect(() => {
        const root = document.documentElement;

        const observer = new MutationObserver(() => {
            setDarkMode(root.classList.contains("dark"));
        })

        observer.observe(root, {
            attributes: true,
            attributeFilter: ['class'],
        })

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
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: darkMode ? "#1f2937" : "#ffffff",
                titleColor: darkMode ? "#ffffff" : "#111827",
                bodyColor: darkMode ? "#ffffff" : "#111827",
                borderColor: "#155dfc",
                borderWidth: 1,
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


    return (
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h1 className="text-xl font-bold mb-4">Monthly Scan Volume</h1>
            <Line data={chartData} options={options} />
        </div>
    );
}