import { api } from "./api";

export async function getAvailableDoctorsApi({ search, page }) {
    const res = await api.get(
        `/invitations/available-doctors?search=${search}&page=${page}`,
    );
    return res.data;
}

export async function getSentInvitationsApi() {
    const res = await api.get("/invitations/sent");
    return res.data;
}

export async function sendInvitationApi(data) {
    const res = await api.post("/invitations", data);
    return res.data;
}

export async function sendActivationRequestApi(data) {
    const res = await api.post("/invitations/activate", data);
    return res.data;
}