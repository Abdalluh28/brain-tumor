import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function FilterItem({ filterBy, clearFlag, setClearFlag }) {

    const [value, setValue] = useState("All")

    // reset the value to All when the filterBy change
    useEffect(() => {
        // setValue("All"); immediately without this function will get warning
        let handleValue = () => {
            setValue("All")
        }
        handleValue()
    }, [filterBy, clearFlag])


    // handle filters when the value change
    const [_, setSearchParams] = useSearchParams();

    useEffect(() => {
        let changeParams = () => {
            setSearchParams(prev => {
                const params = new URLSearchParams(prev);

                // remove all filters first
                params.delete("tumorType");
                params.delete("status");
                params.delete("date");
                params.delete("confidenceFrom");
                params.delete("confidenceTo");

                // add the new filter
                if (value !== 'All') {
                    if (filterBy !== 'confidence') {
                        params.set(filterBy, value);
                    } else {
                        params.set('confidenceFrom', value.split("-")[0]);
                        params.set('confidenceTo', value.split("-")[1]);
                    }
                }

                // set the page to 1 (reset the page number when the filters change)
                params.set("page", 1);

                return params;
            });
            // reset the clear flag
            setClearFlag(false);
        }
        changeParams();
    }, [value]);

    return (
        <div className="xl:w-1/2">
            <Select onValueChange={setValue} value={value}>
                <SelectTrigger className="relative z-50" >
                    <SelectValue placeholder='All' />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                    {filterBy === "tumorType" && (
                        <>
                            <SelectGroup>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="Healthy">Healthy</SelectItem>
                                <SelectItem value="LGG">LGG</SelectItem>
                                <SelectItem value="GBM">GBM</SelectItem>
                                <SelectItem value="Metastasis">Metastasis</SelectItem>
                            </SelectGroup>
                        </>
                    )}
                    {filterBy === "confidence" && (
                        <>
                            <SelectGroup>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="0-80">0 - 80</SelectItem>
                                <SelectItem value="80-90">80 - 90</SelectItem>
                                <SelectItem value="90-100">90 - 100</SelectItem>
                            </SelectGroup>
                        </>
                    )}
                    {filterBy === "status" && (
                        <>
                            <SelectGroup>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Review">Review</SelectItem>
                            </SelectGroup>
                        </>
                    )}
                    {filterBy === "date" && (
                        <>
                            <SelectGroup>
                                <SelectItem value="All">All</SelectItem>
                                {Array.from({ length: 4 }, (_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    )
                                })}
                            </SelectGroup>
                        </>
                    )}
                </SelectContent>
            </Select>
        </div>
    )
}
