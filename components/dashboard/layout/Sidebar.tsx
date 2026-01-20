"use client"

import { createContext, ReactNode, useContext, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
    BookOpen,
    Building2,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    LayoutDashboard,
    LucideIcon,
    Menu,
    Users,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// TYPES & CONTEXT

interface SidebarContextType {
    collapsed: boolean
    setCollapsed: (v: boolean) => void
    mobileOpen: boolean
    setMobileOpen: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    setCollapsed: () => {},
    mobileOpen: false,
    setMobileOpen: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

// NAVIGATION CONFIG

interface NavItem {
    icon: LucideIcon
    label: string
    href: string
    badge?: number
}

const adminNavigation: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/admin" },
    { icon: Users, label: "Usuarios", href: "/dashboard/admin/students" },
    { icon: GraduationCap, label: "Aulas", href: "/dashboard/admin/classrooms" },

]

const teacherNavigation: NavItem[] = [
    { icon: LayoutDashboard, label: "Mis Clases", href: "/dashboard/teacher" },
]

// NAV ITEM COMPONENT

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
    const pathname = usePathname()
    const isActive =
        pathname === item.href ||
        (item.href !== "/dashboard/admin" && pathname.startsWith(item.href))
    const Icon = item.icon

    return (
        <Link href={item.href}>
            <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-normal",
                    "hover:bg-muted",
                    isActive && "bg-primary/10 text-primary font-medium",
                    !isActive && "text-muted-foreground hover:text-foreground"
                )}
            >
                <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />

                <AnimatePresence mode="wait">
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="whitespace-nowrap overflow-hidden"
                        >
                            {item.label}
                        </motion.span>
                    )}
                </AnimatePresence>

                {item.badge && !collapsed && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.badge}
                    </span>
                )}
            </motion.div>
        </Link>
    )
}

// SIDEBAR COMPONENT

interface SidebarProps {
    type: "admin" | "teacher"
    userName?: string
}

export function Sidebar({ type, userName = "Usuario" }: SidebarProps) {
    const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar()
    const navigation = type === "admin" ? adminNavigation : teacherNavigation

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo / Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-lg">L</span>
                        </div>
                        <AnimatePresence mode="wait">
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                >
                                    <div className="font-bold text-lg tracking-tight">Ludus</div>
                                    <div className="text-xs text-muted-foreground">
                                        {type === "admin" ? "Admin" : "Profesor"}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile close */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-2 hover:bg-muted rounded-lg"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
                {navigation.map((item) => (
                    <NavLink key={item.href} item={item} collapsed={collapsed} />
                ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t space-y-2">
                {!collapsed && (
                    <div className="px-3 text-xs text-muted-foreground">
                        Sesion: <span className="font-medium text-foreground">{userName}</span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-normal"
                    type="button"
                >
                    {collapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <>
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm">Contraer</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? "72px" : "280px" }}
                transition={{ duration: 0.2 }}
                className="hidden lg:block fixed left-0 top-0 h-screen bg-card border-r z-30"
            >
                {sidebarContent}
            </motion.aside>

            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed left-0 top-0 h-screen w-[280px] bg-card border-r z-50 lg:hidden"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

// SIDEBAR PROVIDER

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
            {children}
        </SidebarContext.Provider>
    )
}

// MOBILE HEADER

export function MobileHeader({ title }: { title: string }) {
    const { setMobileOpen } = useSidebar()

    return (
        <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-20 flex items-center justify-between px-4">
            <button
                onClick={() => setMobileOpen(true)}
                className="p-2 hover:bg-muted rounded-lg"
                type="button"
            >
                <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold">{title}</span>
            <div className="w-9" />
        </header>
    )
}

// MAIN CONTENT WRAPPER

export function MainContent({ children }: { children: ReactNode }) {
    const { collapsed } = useSidebar()

    return (
        <main
            className={cn(
                "min-h-screen transition-all duration-200",
                "pt-14 lg:pt-0",
                collapsed ? "lg:pl-[72px]" : "lg:pl-[280px]"
            )}
        >
            <div className="p-4 lg:p-6 w-full">{children}</div>
        </main>
    )
}
