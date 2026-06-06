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
        onError: () => {
            toast.error("Failed to create radiology center");
        },
    });

    return { createRadiologyCenter: mutate, isLoading: isPending };
};
