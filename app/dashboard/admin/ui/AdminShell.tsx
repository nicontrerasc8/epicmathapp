"use client"

import {
  Sidebar,
  SidebarProvider,
  MobileHeader,
  MainContent
} from "@/components/dashboard/layout"

interface AdminShellProps {
  children: React.ReactNode
  userName?: string
}

export default function AdminShell({ children, userName = "Admin" }: AdminShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar type="admin" userName={userName} />
        <MobileHeader title="Ludus Admin" />
        <MainContent>
          {children}
        </MainContent>
      </div>
    </SidebarProvider>
  )
}
