import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function SearchBar() {
    const [searchValue, setSearchValue] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();

    // Sync input with URL params
    useEffect(() => {
        const search = searchParams.get("search") || "";
        setSearchValue(search);
    }, [searchParams]);


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

        return () => clearTimeout(debounceRef.current);
    }, [searchValue])

    const handleSearch = (e) => {
        setSearchValue(e.target.value);
    };


    return (
        <div className="flex justify-center items-center relative grow">
            <Search className="text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
                type="text"
                placeholder="Search by Scan ID or Doctor Name"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchValue}
                onChange={handleSearch} />
        </div>
    );
}