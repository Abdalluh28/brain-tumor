import SelectFilter from "./FilterItem";

export default function Filters() {
    return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Filter by prediction */}
            <SelectFilter paramKey="prediction" label="Prediction" options={[
                { label: "All", value: "all" },
                { label: "Healthy", value: "Healthy" },
                { label: "LGG", value: "LGG" },
                { label: "HGG", value: "HGG" },
                { label: "Metastasis", value: "Metastasis" },
                { label: "Others", value: "Others" },
            ]} />

            {/* Filter by confidence */}
            <SelectFilter paramKey="confidence" label="Confidence" options={[
                { label: "All", value: "all" },
                { label: '0-80%', value: "0-80" },
                { label: '80-90%', value: "80-90" },
                { label: '90-100%', value: "90-100" },
            ]} />

            {/* Filter by status */}
            <SelectFilter paramKey="status" label="Status" options={[
                { label: "All", value: "all" },
                { label: "Review", value: "Review" },
                { label: "Completed", value: "Completed" },
            ]} />


            {/* Filter by date */}
        </div>
    )
}
