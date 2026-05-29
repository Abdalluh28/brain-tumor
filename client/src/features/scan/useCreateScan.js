import { createScanApi } from "@/services/scanApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setNewPatient } from "./scanSlice";

export function useCreateScan() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const dispatch = useDispatch();

    const { mutate: createScan, isPending: isLoading } = useMutation({
        mutationFn: (data) => createScanApi(data),
        retry: false,
        onSuccess: (data) => {
            toast.success("Scan created successfully!");
            queryClient.invalidateQueries({
                queryKey: ["scans"],
            });
            dispatch(setNewPatient(false));
            navigate(`/scan/${data.scan._id}`, { replace: true });
        },
        onError: (err) => {
            const message =
                err?.response?.data?.message || "Scan creation failed!";
            toast.error(message);
            if (err?.response?.status === 404) {
                dispatch(setNewPatient(true));
            }
        },
    });

    return { createScan, isLoading };
}
