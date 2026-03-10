import {
    getAccessToken,
    setAccessToken,
    clearAccessToken,
} from "@/utils/tokenManager";
import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_BACK_URL,
    withCredentials: true,
});

// Interceptors to add authorization header
api.interceptors.request.use((config) => {
    const token = getAccessToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Interceptors to refresh token if needed
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Try refresh on 401 (no token) or 403 (expired/invalid token)
        if (
            (error.response?.status === 401 ||
                error.response?.status === 403) &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true;

            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_BACK_URL}/auth/refresh`,
                    { withCredentials: true },
                );

                setAccessToken(res.data.accessToken);

                originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;

                return api(originalRequest);
            } catch (err) {
                clearAccessToken();
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    },
);
