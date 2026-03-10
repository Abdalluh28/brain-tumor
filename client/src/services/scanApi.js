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

export async function getScansApi() {
    const res = await api.get("/scan");
    console.log(res.data)
    return res.data;
}

export async function getScanApi(id) {
    const res = await api.get(`/scan/${id}`);
    return res.data;
}

export async function deleteScanApi(id) {
    const res = await api.delete(`/scan/${id}`);
    return res.data;
}
