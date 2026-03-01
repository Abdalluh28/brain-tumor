const STORAGE_KEY = "accessToken";

// Restore token from localStorage on load (survives refresh)
let accessToken =
    (typeof localStorage !== "undefined" &&
        localStorage.getItem(STORAGE_KEY)) ||
    null;

export const setAccessToken = (token) => {
    accessToken = token;
    if (typeof localStorage !== "undefined") {
        if (token) localStorage.setItem(STORAGE_KEY, token);
        else localStorage.removeItem(STORAGE_KEY);
    }
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
    accessToken = null;
    if (typeof localStorage !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
    }
};
