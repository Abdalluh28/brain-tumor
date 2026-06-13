import { Eye, ScanSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMarkAsRead } from "./services/useMarkAsRead";

export default function ScanNotification({ notification }) {
    const { markAsRead } = useMarkAsRead();
    const navigate = useNavigate();

    const handleScanNotification = () => {
        markAsRead(notification.id);
        navigate(`/scan/${notification.scanId}`);
    };

    return (
        <div
            className={`
                p-4 border-b border-slate-200 dark:border-slate-800
                transition-colors duration-200
                hover:bg-slate-50 dark:hover:bg-slate-900
                ${!notification.isRead
                    ? "bg-blue-50/50 dark:bg-blue-950/20"
                    : ""
                }
            `}
        >
            <div className="flex items-start gap-3">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <ScanSearch className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                        {notification.message}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                        {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                        )}

                        <button
                            onClick={handleScanNotification}
                            className="
                                ml-auto flex items-center gap-2
                                rounded-lg bg-primary px-3 py-1.5
                                text-sm font-medium text-white
                                transition hover:bg-primary-hover
                            "
                        >
                            <Eye size={16} />
                            View Scan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}