import CenterGuard from "@/features/center/centerGuard";
import RadiologyCenterHeader from "@/features/center/RadiologyCenterHeader";
import SearchAndFilters from "@/features/center/SearchAndFilters";
import Table from "@/features/center/Table";

export default function RadiologyCenter() {
    return (
        <CenterGuard>
            <div>
                <RadiologyCenterHeader />
                <div className="flex flex-col gap-6 px-4 lg:px-8 py-8">
                    <SearchAndFilters />
                    <Table />
                </div>
            </div>
        </CenterGuard>
    )
}
