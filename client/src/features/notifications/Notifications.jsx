import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";
import { useGetUnreadCount } from "./services/useGetUnreadCount";
import { useGetNotifications } from "./services/useGetNotifications";
import JoinRequestNotification from "./JoinRequestNotification";
import ActivationNotification from "./ActivationNotification";
import InvitationNotification from "./InvitationNotification";
import ScanNotification from "./ScanNotification";
import { useMarkAllAsRead } from "./services/useMarkAllAsRead";

export default function Notifications() {
    const { notifications, isLoading } = useGetNotifications();
    const { unreadCount, isLoading: unreadCountLoading } = useGetUnreadCount();
    const { markAllAsRead, isLoading: markAllAsReadLoading } = useMarkAllAsRead();

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none">
                    <Bell className="h-5 w-5" />

                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {unreadCountLoading ? "…" : unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    className="w-80 rounded-xl border border-slate-200 dark:border-slate-700 
                               bg-white dark:bg-slate-900 shadow-xl 
                               text-slate-800 dark:text-slate-100 p-2"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-sm text-slate-900 dark:text-white">Notifications</span>
                        <button
                            type="button"
                            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                            onClick={() => markAllAsRead()}
                            disabled={markAllAsReadLoading}>
                            {markAllAsReadLoading ? "Marking..." : "Mark all as read"}
                        </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
                                No notifications
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 py-1">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className="rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        {notification.type === "CENTER_INVITATION" && (
                                            <InvitationNotification notification={notification} />
                                        )}

                                        {notification.type === "SCAN_FINISHED" && (
                                            <ScanNotification notification={notification} />
                                        )}

                                        {notification.type === "JOIN_CENTER_REQUEST" && (
                                            <JoinRequestNotification notification={notification} />
                                        )}

                                        {notification.type === "ACCOUNT_ACTIVATION_REQUEST" && (
                                            <ActivationNotification notification={notification} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}