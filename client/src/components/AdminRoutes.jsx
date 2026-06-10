import { useUser } from "@/features/settings/useUser";
import SkeletonLoader from "./SkeletonLoader";
import { Navigate, Outlet } from "react-router-dom";

export default function AdminRoutes() {

    const { user, isLoading } = useUser();

    if (isLoading) return <SkeletonLoader count={1} height={400} />

    if (!user || user.role !== 'admin') return <Navigate to="/" replace={true} />

    return <Outlet />
}
