import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function SearchBar() {
    const [searchValue, setSearchValue] = useState("");
    const [_, setSearchParams] = useSearchParams();
    // we can apply debounce using useRef and useEffect
    // debounceRef will be used to store the timeout as it can presist between re-renders
    const debounceRef = useRef(null);

    useEffect(() => {
        // clear the previous timeout
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        
        // set a new timeout
        debounceRef.current = setTimeout(() => {
            setSearchParams(prev => {
                const params = new URLSearchParams(prev);
                if (searchValue && searchValue.length > 0) {
                    params.set("search", searchValue);
                } else {
                    params.delete("search");
                }
                params.set('page', 1);
                return params
            })
        }, 500);
    }, [searchValue])

    const handleSearch = (e) => {
        setSearchValue(e.target.value);
    };


    return (
        <div className="lg:col-span-2 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl">
            <Search className="text-slate-600 dark:text-slate-400" />
            <input
                type="text"
                value={searchValue}
                onChange={handleSearch}
                placeholder="Search By Scan ID or Doctor Name"
                className="w-full outline-none border-none bg-slate-100 dark:bg-slate-800 p-1"
            />
        </div>
    );
}