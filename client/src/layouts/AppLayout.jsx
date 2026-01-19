import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppSidebar from "@/components/AppSidebar"
import { Outlet } from "react-router-dom"

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="bg-gray-100 dark:bg-gray-900 min-h-screen ">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
