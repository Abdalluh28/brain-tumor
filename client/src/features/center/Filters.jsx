import SelectFilter from "../history/FilterItem";

export default function Filter({ adminOptions, locationOptions }) {
    return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Filter by location */}
            <SelectFilter
                paramKey="location"
                label="Location"
                options={locationOptions}
                resetPageOnChange
            />


            {/* Filter by admin */}
            <SelectFilter
                paramKey="admin"
                label="Admin"
                options={adminOptions}
                resetPageOnChange
            />

        </div>
    )
}
