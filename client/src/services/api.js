import {
    getAccessToken,
    setAccessToken,
    clearAccessToken,
} from "@/utils/tokenManager";
import axios from "axios";
import toast from "react-hot-toast";

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
        const errorMessage = error.response?.data?.message || error.response?.data?.error;

        // Resource-level 403 handling (no token refresh needed)
        if (
            error.response?.status === 403 &&
            typeof errorMessage === "string" &&
            errorMessage.startsWith("Forbidden:")
        ) {
            toast.error(errorMessage);
            if (window.location.pathname !== "/") {
                window.location.href = "/";
            }
            return Promise.reject(error);
        }

        // Global 404 handling
        if (error.response?.status === 404) {
            toast.error(errorMessage || "Resource not found.");
            if (window.location.pathname !== "/") {
                window.location.href = "/";
            }
            return Promise.reject(error);
        }

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
                // Optionally navigate to login on refresh failure
                if (window.location.pathname !== "/auth/login") {
                    window.location.href = "/auth/login";
                }
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    },
);
