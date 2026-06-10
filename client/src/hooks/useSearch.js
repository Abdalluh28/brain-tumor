import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useSearch() {
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
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                if (searchValue && searchValue.length > 0) {
                    params.set("search", searchValue);
                } else {
                    params.delete("search");
                }
                params.set("page", 1);
                return params;
            });
        }, 500);

        return () => clearTimeout(debounceRef.current);
    }, [searchValue]);

    const handleSearch = (e) => {
        setSearchValue(e.target.value);
    };

    return { searchValue, handleSearch };
}
