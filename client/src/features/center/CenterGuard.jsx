import { Navigate } from "react-router-dom";
import { useUser } from "../settings/useUser";

export default function CenterGuard({ children }) {

    const { user } = useUser();

    if (user.radiologyCenterId) return <Navigate to="/" replace={true} />

    return (
        <>
            {children}
        </>
    )
}
