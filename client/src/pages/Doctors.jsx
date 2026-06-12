import DoctorsHeader from "@/features/doctors/DoctorsHeader";
import DoctorsSearch from "@/features/doctors/DoctorsSearch";
import DoctorsTable from "@/features/doctors/DoctorsTable";

export default function Doctors() {

    const invitePage = false;

    return (
        <div className="flex-1 overflow-auto lg:ml-0">
            <DoctorsHeader invitePage={invitePage} />
            <div className="flex flex-col gap-6 px-4 lg:px-8 py-8">
                <DoctorsSearch invitePage={invitePage} />
                <DoctorsTable invitePage={invitePage} />
            </div>
        </div>
    )
}
