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
import ThemeToggle from "./ThemeToggle";

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
                <div className="flex gap-2 items-center justify-center border-b border-slate-200 pb-4">
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
                            <SidebarMenuItem>
                                <SidebarMenuButton isActive={true}>
                                    <LayoutDashboard className="mr-1 h-5! w-5!" />
                                    Dashboard
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Upload className="mr-1 h-5! w-5!" />
                                    Upload MRI
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <History className="mr-1 h-5! w-5!" />
                                    History
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Settings className="mr-1 h-5! w-5!" />
                                    Settings
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter>
                <div className="flex justify-around items-center mb-4 border-t-2 border-slate-200 pt-6">
                    <div className="flex gap-2 items-center">
                        <span className="bg-slate-200 rounded-full p-2 text-slate">DR</span>
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
