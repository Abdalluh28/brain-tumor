import { api } from "./api";

export async function getUser() {
    const res = await api.get("/user");
    return res.data;
}

export async function updateUser(data) {
    const res = await api.post("/user/profile", data);
    return res.data;
}

export async function deleteUser(id) {
    const res = await api.delete(`/user/${id}`);
    return res;
}
