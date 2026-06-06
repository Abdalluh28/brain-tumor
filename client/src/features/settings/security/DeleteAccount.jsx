import { ArrowLeft } from "lucide-react";
import { useDeleteUser } from "../useDeleteUser";
import Spinner from "@/components/Spinner";

export default function DeleteAccount({ onBack }) {

    const { deleteUser, isLoading } = useDeleteUser();

    return (
        <div>
            <button onClick={onBack} type="button" className="text-primary flex items-center gap-1 text-sm mb-4 hover:text-primary-hover transition duration-300 cursor-pointer ">
                <ArrowLeft size={15} />
                Back to Security
            </button>

            <div>
                <p className="text-2xl font-semibold">Delete Account</p>
            </div>

            <div className="mt-6">
                <p className="text-red-600 font-semibold mb-2">Are you sure you want to delete your account?</p>
                <p className="text-slate-500 mb-4">This action cannot be undone. This will permanently delete your account and remove all your data.</p>
                <button
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-300 cursor-pointer"
                    onClick={deleteUser}
                    disabled={isLoading}
                >
                    {isLoading ? <Spinner color="text-white" /> : "Yes, Delete My Account"}
                </button>
            </div>
        </div>
    )
}
