import { api } from "./api";

export async function getUserApi() {
    const res = await api.get("/user");
    return res.data;
}

export async function updateUserApi(data) {
    const res = await api.post("/user/profile", data);
    return res.data;
}

export async function deleteUserApi(id) {
    const res = await api.delete(`/user/${id}`);
    return res;
}
