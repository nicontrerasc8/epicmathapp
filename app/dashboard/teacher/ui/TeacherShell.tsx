"use client"

import {
    Sidebar,
    SidebarProvider,
    MobileHeader,
    MainContent
} from "@/components/dashboard/layout"

interface TeacherShellProps {
    children: React.ReactNode
    userName?: string
}

export default function TeacherShell({ children, userName = "Profesor" }: TeacherShellProps) {
    return (
        <SidebarProvider>
            <div className="min-h-screen bg-background">
                <Sidebar type="teacher" userName={userName} />
                <MobileHeader title="Ludus Profesor" />
                <MainContent>
                    {children}
                </MainContent>
            </div>
        </SidebarProvider>
    )
}
