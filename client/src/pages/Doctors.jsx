import DoctorsHeader from "@/features/doctors/DoctorsHeader";
import DoctorsSearch from "@/features/doctors/DoctorsSearch";
import DoctorsTable from "@/features/doctors/DoctorsTable";

export default function Doctors() {

    const invitePage = false;

    return (
        <div className="flex-1 overflow-auto lg:ml-0">
            <DoctorsHeader invitePage={invitePage} />
            <div className="p-4 md:p-8">
                <div className="flex flex-col sm:flex-row gap-3 mb-6 ">
                    <DoctorsSearch invitePage={invitePage} />
                </div>
                <DoctorsTable invitePage={invitePage} />
            </div>
        </div>
    )
}
