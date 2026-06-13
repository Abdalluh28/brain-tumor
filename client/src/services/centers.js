import { api } from "./api";

export async function getCentersApi({ search, location, admin, page }) {
    const res = await api.get(
        `/centers?search=${search}&location=${location}&admin=${admin}&page=${page}`,
    );
    return res.data;
}

export async function createRadiologyCenterApi(data) {
    const res = await api.post("/centers/create", data);
    return res.data
}

export async function sendJoinCenterRequestApi(id) {
    const res = await api.post(`/centers/${id}/join-request`);
    return res.data
}

export async function getJoinCenterRequestsApi() {
    const res = await api.get("/centers/center-requests");
    return res.data;
}

export async function respondToJoinCenterRequestApi(data) {
    const res = await api.patch(`/centers/${data.notificationId}`, data);
    return res.data
}
