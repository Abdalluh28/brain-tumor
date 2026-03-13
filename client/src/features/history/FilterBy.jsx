import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Funnel } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import FilterItem from "./FilterItem";

export default function FilterBy() {

    const [filterBy, setFilterBy] = useState("tumorType")
    const [_, setSearchParams] = useSearchParams();
    // clear flag will be used in filter item component to clear any specific filter
    const [clearFlag, setClearFlag] = useState(false);

    // clear all filters by resetting the search params and setting the clear flag
    const handleClearFilters = () => {
        setSearchParams({ page: 1 });
        setClearFlag(true);
    }

    return (
        <div className="flex flex-col xl:flex-row gap-2 xl:items-center">
            <div className="flex gap-1 items-center xl:w-1/2">
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
                <Select onValueChange={setFilterBy}>
                    <SelectTrigger className="relative z-50" >
                        <SelectValue placeholder="Select a filter" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                        <SelectGroup>
                            <SelectItem value="tumorType">Tumor Type</SelectItem>
                            <SelectItem value="confidence">Confidence</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <FilterItem filterBy={filterBy} clearFlag={clearFlag} setClearFlag={setClearFlag} />
        </div>
    )
}

