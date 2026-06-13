import { api } from "./api";

export async function getUserApi() {
    const res = await api.get("/user");
    return res.data;
}

export async function getDoctorsApi({
    search = "",
    page = 1,
    status = "",
} = {}) {

    const res = await api.get(
        `/user/doctors?search=${search}&page=${page}&status=${status}`,
    );

    return res.data;
}

export async function updateUserApi(data) {
    const res = await api.post("/user/profile", data);
    return res.data;
}

export async function updateUserByAdminApi(data) {
    const res = await api.post(`/user/${data.id}`, data);
    return res.data;
}

export async function deleteUserApi(id) {
    const res = await api.delete(`/user/${id}`);
    return res;
}

