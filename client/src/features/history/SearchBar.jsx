import { useSearch } from "@/hooks/useSearch";
import { Search } from "lucide-react";

export default function SearchBar() {

    const { searchValue, handleSearch } = useSearch();


    return (
        <div className="flex justify-center items-center relative grow">
            <Search className="text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
                type="text"
                placeholder="Search by Patient Name or Patient ID"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchValue}
                onChange={handleSearch} />
        </div>
    );
}