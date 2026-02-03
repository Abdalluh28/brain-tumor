import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger
} from "@/components/ui/sidebar";

import { Brain, History, LayoutDashboard, LogOut, Settings, Upload, X } from "lucide-react";
import ThemeToggle from "../features/theme/ThemeToggle";
import { NavLink } from "react-router-dom";

export default function AppSidebar() {
    return (
        <Sidebar>
            {/* Header */}
            <div className="flex flex-row-reverse md:hidden">
                <SidebarTrigger>
                    <X className="h-5 w-5" />
                </SidebarTrigger>
            </div>
            <SidebarHeader>
                <div className="flex gap-2 items-center justify-center dark:border-b dark:border-b-slate-600 pb-4">
                    <span className="bg-primary rounded-2xl py-2">
                        <Brain color="white" />
                    </span>
                    <div>
                        <p className="font-bold text-2xl">BrainTumorNet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Medical AI System</p>
                    </div>
                </div>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent>
                <SidebarGroup>

                    <SidebarGroupContent>
                        <SidebarMenu>

                            {/* array of objects of name, path, and icon */}
                            {[
                                { name: 'Dashboard', path: '/', icon: LayoutDashboard },
                                { name: 'Upload Scan', path: '/scan', icon: Upload },
                                { name: 'History', path: '/history', icon: History },
                                { name: 'Settings', path: '/settings', icon: Settings }
                            ].map(item => (
                                <SidebarMenuItem key={item.name}>
                                    <NavLink to={item.path} end>
                                        {({ isActive }) => (
                                            <SidebarMenuButton isActive={isActive}>
                                                <item.icon className="mr-1 h-5! w-5!" />
                                                {item.name}
                                            </SidebarMenuButton>
                                        )}
                                    </NavLink>
                                </SidebarMenuItem>
                            ))}


                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter>
                <div className="flex justify-around items-center mb-4 dark:border-t dark:border-t-slate-600 pt-6">
                    <div className="flex gap-2 items-center">
                        <span className="bg-sidebar-theme-toggle dark:bg-sidebar-theme-toggle rounded-full p-2 text-slate">DR</span>
                        <div className="flex flex-col">
                            {/* name */}
                            <p className="text-md">Dr. John Doe</p>
                            {/* role */}
                            <p className="text-xs text-slate-500">Radiologist</p>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                <SidebarMenuItem >
                    <SidebarMenuButton>
                        <LogOut className="mr-1 h-5! w-5!" />
                        Sign Out
                    </SidebarMenuButton>
                </SidebarMenuItem>

            </SidebarFooter>
        </Sidebar>
    );
}
