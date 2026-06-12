import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Funnel, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUser } from "../settings/useUser";
import Filters from "./Filters";
import SearchBar from "./SearchBar";
import { useGetDoctors } from "./useGetDoctors";
export default function SearchAndFilter() {

    const [showFilters, setShowFilters] = useState(false);
    const [_, setSearchParams] = useSearchParams();

    const { user } = useUser();
    const { doctors } = useGetDoctors();

    const doctorOptions = [
        {
            label: "All",
            value: "all",
        },
        {
            label: user?.name ? `${user.name} (Me)` : "My Scans",
            value: "me",
        },
        ...(doctors ?? []).map((doctor) => ({
            label: doctor.name,
            value: String(doctor.id),
        })),
    ];

    const updateFilterVisibility = () => {
        setShowFilters(prev => !prev);
    }

    const handleClearFilters = () => {
        setSearchParams({ page: 1 });
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
                <SearchBar />
                <div className="flex items-center gap-2">
                    <button className='flex items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300'
                        onClick={updateFilterVisibility}>
                        <SlidersHorizontal />
                        <span>Filters</span>
                    </button>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="cursor-pointer"
                                onClick={handleClearFilters}>
                                <Funnel />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Clear</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
            {showFilters && <Filters doctorOptions={doctorOptions} />}
        </div>
    )
}
