import React from 'react'
import { Pie } from 'react-chartjs-2'
import { data } from '../../data'

export default function PieChart() {

    const types = {
        Healthy: data.filter(item => item.prediction === 'Healthy').length,
        GBM: data.filter(item => item.prediction === 'GBM').length,
        LGG: data.filter(item => item.prediction === 'LGG').length,
        Metastasis: data.filter(item => item.prediction === 'Metastasis').length,
    }

    const pieData = {
        labels: ['GBM', 'LGG', 'Metastasis', 'Healthy'],
        datasets: [
            {
                data: [types.GBM, types.LGG, types.Metastasis, types.Healthy],
                backgroundColor: ['#ef4444', '#f59e0b', '#8b5cf6', '#10b981'],
                borderWidth: 0,
            }
        ]
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false, // 🔑 important
        cutout: '70%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
        },
    }

    const typesColors = {
        'GBM': '#ef4444',
        'LGG': '#f59e0b',
        'Metastasis': '#8b5cf6',
        'Healthy': '#10b981',
    }

    return (
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col">
            <h1 className="text-xl font-bold mb-4">
                Classification Distribution
            </h1>

            <div className="relative w-full max-w-md h-64 flex justify-center self-center">
                <Pie data={pieData} options={options} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(types).map(([key]) => (
                    <div key={key} className="flex items-center">
                        <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: typesColors[key] }}
                        />
                        <span>{key}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
