import React from 'react'
import { Pie } from 'react-chartjs-2'
import { useClassDistribution } from './useClassDistribution'
import Spinner from '@/components/Spinner';

export default function PieChart() {

    const { data, isLoading } = useClassDistribution();

    if (isLoading) {
        return <Spinner />
    }

    // ✅ Normalize API data into object
    const types = {
        HGG: 0,
        LGG: 0,
        Metastasis: 0,
        Healthy: 0,
        Others: 0,
    };

    data?.forEach(item => {
        types[item.type] = item.count;
    });

    const pieData = {
        labels: ['HGG', 'LGG', 'Metastasis', 'Healthy', 'Others'],
        datasets: [
            {
                data: [
                    types.HGG,
                    types.LGG,
                    types.Metastasis,
                    types.Healthy,
                    types.Others,
                ],
                backgroundColor: ['#ef4444', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6'],
                borderWidth: 0,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: { display: false },

            // 🔥 Better Tooltip
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label;
                        const value = context.raw;

                        return `${label}: ${value} scans`;
                    }
                }
            },
        },
    };

    const typesColors = {
        HGG: '#ef4444',
        LGG: '#f59e0b',
        Metastasis: '#8b5cf6',
        Healthy: '#10b981',
        Others: '#3b82f6',
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col">
            <h1 className="text-xl font-bold mb-4">
                Classification Distribution
            </h1>

            <div className="relative w-full max-w-md h-64 flex justify-center self-center">
                <Pie data={pieData} options={options} />
            </div>

            {/* ✅ Legend with counts */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(types).map(([key, value]) => (
                    <div key={key} className="flex items-center">
                        <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: typesColors[key] }}
                        />
                        <span>{key} ({value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
}