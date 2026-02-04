import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react";

export default function FilterItem({ filterBy }) {

    const [value, setValue] = useState("All")

    useEffect(() => {
        // setValue("All") immediately without this function will get warning
        let handleValue = () => {
            setValue("All")
        }
        handleValue()
    }, [filterBy])

    return (
        <div className="xl:w-1/2">
            <Select onValueChange={setValue} value={value}>
                <SelectTrigger className="relative z-50" >
                    <SelectValue placeholder='All' />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                    <SelectGroup>
                        {filterBy === "tumorType" && (
                            <>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="Healthy">Healthy</SelectItem>
                                <SelectItem value="LGG">LGG</SelectItem>
                                <SelectItem value="GBM">GBM</SelectItem>
                                <SelectItem value="Metastasis">Metastasis</SelectItem>
                            </>
                        )}
                        {filterBy === "Confidence" && (
                            <>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="0">0 - 80</SelectItem>
                                <SelectItem value="80">80 - 90</SelectItem>
                                <SelectItem value="90">90 - 100</SelectItem>
                            </>
                        )}
                        {filterBy === "Status" && (
                            <>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Review">Review</SelectItem>
                            </>
                        )}
                        {filterBy === "Date" && (
                            <>
                                <SelectItem value="All">All</SelectItem>
                                {Array.from({ length: 4 }, (_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    )
                                })}
                            </>
                        )}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    )
}
