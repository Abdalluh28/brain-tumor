import { CircleAlert, CircleCheckBig } from "lucide-react";

export const PREDICTION_CONFIG = {
    healthy: {
        textColor: "text-scan-header-healthy-text",
        iconColor: "text-scan-header-healthy-icon",
        bg: "bg-scan-header-healthy-bg",
        border: "border-green-200 dark:border-green-800",
        Icon: CircleCheckBig,
        color: "#00a63e",
        darkColor: '#05df72'
    },
    lgg: {
        textColor: "text-scan-header-lgg-text",
        iconColor: "text-scan-header-tumor-icon",
        bg: "bg-scan-header-lgg-bg",
        border: "border-orange-200 dark:border-orange-800",
        Icon: CircleAlert,
        color: "#f54a00",
        darkColor: '#ff8904'
    },
    gbm: {
        textColor: "text-scan-header-gbm-text",
        iconColor: "text-scan-header-tumor-icon",
        bg: "bg-scan-header-gbm-bg",
        border: "border-red-200 dark:border-red-800",
        Icon: CircleAlert,
        color: '#e7000b',
        darkColor: '#ff6467'
    },
    metastasis: {
        textColor: "text-scan-header-metastasis-text",
        iconColor: "text-scan-header-tumor-icon",
        bg: "bg-scan-header-metastasis-bg",
        border: "border-purple-200 dark:border-purple-800",
        Icon: CircleAlert,
        color: '#9810fa',
        darkColor: '#c27aff'
    },
};
