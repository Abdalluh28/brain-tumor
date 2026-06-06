export default function SegmentationStatsTable({ classStats = [], title }) {
    if (!classStats.length) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            {title ? (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {title}
                </p>
            ) : null}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="text-left p-3 font-medium">Class</th>
                            <th className="text-left p-3 font-medium">Color</th>
                            <th className="text-right p-3 font-medium">Pixels</th>
                            <th className="text-right p-3 font-medium">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classStats.map((row) => (
                            <tr
                                key={row.classId}
                                className="border-t border-slate-100 dark:border-slate-700"
                            >
                                <td className="p-3">{row.label}</td>
                                <td className="p-3">
                                    <span
                                        className="inline-block w-5 h-5 rounded border border-slate-300"
                                        style={{ backgroundColor: row.colorHex }}
                                    />
                                </td>
                                <td className="p-3 text-right tabular-nums">
                                    {row.pixelCount?.toLocaleString?.() ?? row.pixelCount}
                                </td>
                                <td className="p-3 text-right tabular-nums">
                                    {row.percentage}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
