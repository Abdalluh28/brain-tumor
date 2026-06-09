import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";

export default function Notifications() {
    const unreadCount = 3;

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors focus:outline-none">
                    <Bell className="h-5 w-5" />

                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    className="w-80 rounded-lg border bg-white p-2 shadow-lg"
                >
                    <div className="border-b px-3 py-2 font-semibold">
                        Notifications
                    </div>

                    <DropdownMenu.Item className="cursor-pointer rounded p-3 outline-none hover:bg-gray-100">
                        New MRI scan uploaded
                    </DropdownMenu.Item>

                    <DropdownMenu.Item className="cursor-pointer rounded p-3 outline-none hover:bg-gray-100">
                        Report generated successfully
                    </DropdownMenu.Item>

                    <DropdownMenu.Item className="cursor-pointer rounded p-3 outline-none hover:bg-gray-100">
                        Doctor account created
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}