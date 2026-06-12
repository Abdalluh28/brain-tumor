import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import CustomDatePicker from "./CustomDatePicker";
import SelectFilter from "./FilterItem";

export default function Filters({ doctorOptions }) {
    const [searchParams, setSearchParams] = useSearchParams();

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        if (startDate) {
            params.set("start", startDate.format("YYYY-MM-DD"));
        } else {
            params.delete("start");
        }

        if (endDate) {
            params.set("end", endDate.format("YYYY-MM-DD"));
        } else {
            params.delete("end");
        }

        setSearchParams(params);
    }, [startDate, endDate]);


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


            {/* Filter by doctor */}
            <SelectFilter
                paramKey="doctor"
                label="Doctor"
                options={doctorOptions}
                defaultValue="me"
                resetPageOnChange
            />

            {/* Filter by date */}
            <CustomDatePicker
                label="Start Date"
                date={startDate}
                setDate={setStartDate}
                endDate={endDate}
            />

            <CustomDatePicker
                label="End Date"
                date={endDate}
                setDate={setEndDate}
                startDate={startDate}
            />
        </div>
    )
}
