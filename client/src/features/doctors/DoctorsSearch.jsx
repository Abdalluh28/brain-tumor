import { useSearch } from "@/hooks/useSearch";
import { Search } from "lucide-react";

export default function DoctorsSearch() {

    const { searchValue, handleSearch } = useSearch();


    return (
        <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                type="text"
                placeholder="Search by Doctor Name or Email"
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                value={searchValue}
                onChange={handleSearch}
            />
        </div>
    )
}
