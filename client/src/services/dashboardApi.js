import { api } from "./api";

export async function getClassDistributionApi() {
    const res = await api.get("/dashboard/classDistribution");
    return res.data;
}

export async function getMonthlyDistributionApi() {
    const res = await api.get("/dashboard/monthlyDistribution");
    return res.data;
}

export async function getStatsApi() {
    const res = await api.get("/dashboard/stats");
    return res.data;
}

export async function getRecentScansApi() {
    const res = await api.get("/dashboard/recentScans");
    return res.data;
}
