import { useSearchParams } from "react-router-dom";

export default function SelectFilter({ label, options, paramKey }) {

    const [searchParams, setSearchParams] = useSearchParams();

    const value = searchParams.get(paramKey) || "all";

    const handleSelect = (e) => {
        const value = e.target.value;

        setSearchParams(prev => {
            const params = new URLSearchParams(prev);

            if (value !== "all") {
                params.set(paramKey, value);
            } else {
                params.delete(paramKey);
            }

            return params;
        });
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={handleSelect} value={value}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}