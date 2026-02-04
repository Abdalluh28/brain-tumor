import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import FilterItem from "./FilterItem"
import { useState } from "react"
import { Funnel } from "lucide-react"

export default function FilterBy() {

    const [filterBy, setFilterBy] = useState("tumorType")

    return (
        <div className="flex flex-col xl:flex-row gap-2 xl:items-center">
            <div className="flex gap-1 items-center xl:w-1/2">
                <Funnel />
                <Select onValueChange={setFilterBy}>
                    <SelectTrigger className="relative z-50" >
                        <SelectValue placeholder="Select a filter" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                        <SelectGroup>
                            <SelectItem value="tumorType">Tumor Type</SelectItem>
                            <SelectItem value="Confidence">Confidence</SelectItem>
                            <SelectItem value="Status">Status</SelectItem>
                            <SelectItem value="Date">Date</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <FilterItem filterBy={filterBy} />
        </div>
    )
}

