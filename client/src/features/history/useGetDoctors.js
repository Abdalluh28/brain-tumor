import { getDoctorsApi } from "@/services/userApi";
import { useUser } from "@/features/settings/useUser";
import { useQuery } from "@tanstack/react-query";

export const useGetDoctors = () => {
    const { user, isLoading: isUserLoading } = useUser();

    const { data, isPending, error } = useQuery({
        queryFn: () => getDoctorsApi(),
        queryKey: ["doctors", user?.radiologyCenterId],
        enabled: Boolean(user?.radiologyCenterId),
        retry: false,
    });

    return {
        doctors: data ?? [],
        isLoading: isUserLoading || isPending,
        error,
        hasRadiologyCenter: Boolean(user?.radiologyCenterId),
    };
};
