import { api } from "./api";

export async function createScanApi(data) {
    // Create a FormData object to hold the files
    const formData = new FormData();

    // Append files to FormData
    data.files.forEach((file) => {
        formData.append("files", file.rawFile);
    });

    // Append other data to FormData
    const { patientData } = data;
    formData.append("patientName", patientData.patientName);
    formData.append("patientId", patientData.patientId);
    formData.append("patientAge", patientData.patientAge);
    formData.append("patientGender", patientData.patientGender);
    formData.append("patientPhone", patientData.patientPhone);
    formData.append("notes", patientData.notes);
    formData.append("scanType", patientData.scanType);

    const res = await api.post("/scan", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return res.data;
}

export async function getScansApi({
    page = 1,
    type = "",
    confidenceFrom = "",
    confidenceTo = "",
    status = "",
    startDate = "",
    endDate = "",
    search = "",
}) {
    const res = await api.get(
        `/scan?page=${page}&type=${type}&confidenceFrom=${confidenceFrom}&confidenceTo=${confidenceTo}&status=${status}&startDate=${startDate}&endDate=${endDate}&search=${search}`,
    );
    return res.data;
}

export async function getScanApi(id) {
    console.log(id);
    const res = await api.get(`/scan/${id}`);
    return res.data;
}

export async function deleteScanApi(id) {
    const res = await api.delete(`/scan/${id}`);
    return res.data;
}
