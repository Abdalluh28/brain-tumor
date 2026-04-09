import { api } from "./api";

export async function createScanApi(files) {
    // Create a FormData object to hold the files
    const formData = new FormData();

    // Append files to FormData
    files.forEach((file) => {
        formData.append("files", file.rawFile);
    });

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
    date = "",
    search = "",
}) {
    const res = await api.get(
        `/scan?page=${page}&type=${type}&confidenceFrom=${confidenceFrom}&confidenceTo=${confidenceTo}&status=${status}&date=${date}&search=${search}`,
    );
    return res.data;
}

export async function getScanApi(id) {
    console.log(id)
    const res = await api.get(`/scan/${id}`);
    return res.data;
}

export async function deleteScanApi(id) {
    const res = await api.delete(`/scan/${id}`);
    return res.data;
}
