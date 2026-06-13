import { api } from "./api";

export async function getNotificationsApi() {
    const res = await api.get("/notifications");
    return res.data;
}

export async function getUnreadCountApi() {
    const res = await api.get("/notifications/unread-count");
    return res.data;
}

export async function markAsReadApi(id) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
}

export async function markAllAsReadApi() {
    const res = await api.patch("/notifications/read-all");
    return res.data;
}

export async function acceptInvitationApi(id) {
    const res = await api.post(`/notifications/${id}/accept`);
    return res.data;
}

export async function rejectInvitationApi(id) {
    const res = await api.post(`/notifications/${id}/reject`);
    return res.data;
}

export async function respondToActivationRequestApi(data) {
    const res = await api.patch(`/activation-request/${data.notificationId}`, data);
    return res.data;
}