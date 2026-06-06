import { createRadiologyCenterApi } from "@/services/authApi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export const useRadiologyCenter = () => {
    const navigate = useNavigate();

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => createRadiologyCenterApi(data),
        onSuccess: () => {
            toast.success("Radiology center created successfully");
            navigate("/login", { replace: true });
        },
        onError: (error) => {
            const message = error?.response?.data?.message || "Failed to create radiology center";
            toast.error(message);
        },
    });

    return { createRadiologyCenter: mutate, isLoading: isPending };
};
