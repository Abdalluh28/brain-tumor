import { setAccessToken, clearAccessToken } from "@/utils/tokenManager";
import { api } from "./api";

// api calls for authentication

export async function loginApi(data) {
    const res = await api.post("/auth/login", data);

    setAccessToken(res.data.accessToken);

    return res.data;
}

export async function registerApi(data) {
    const res = await api.post("/auth/register", data);
    return res;
}

export async function refreshApi() {
    const res = await api.get("/auth/refresh");
    return res;
}

export async function logoutApi() {
    const res = await api.post("/auth/logout");
    clearAccessToken();
    return res;
}

export async function forgotPasswordApi(data) {
    const res = await api.post("/password/forgot", data);
    return res;
}

export async function resetPasswordApi(data) {
    const res = await api.post("/password/reset", data);
    return res;
}

export async function createRadiologyCenterApi(data) {
    const res = await api.post("/auth/create-radiology-center", data);
    return res;
}
