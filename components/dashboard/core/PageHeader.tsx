"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight, LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
    label: string
    href?: string
}

interface PageHeaderProps {
    title: string
    description?: string
    breadcrumbs?: BreadcrumbItem[]
    actions?: ReactNode
    backHref?: string
    backLabel?: string
    className?: string
    badge?: {
        label: string
        variant?: "default" | "success" | "warning" | "danger"
    }
}

const badgeVariants = {
    default: "bg-muted text-muted-foreground",
    success: "bg-secondary/10 text-secondary",
    warning: "bg-accent/20 text-accent-foreground",
    danger: "bg-destructive/10 text-destructive",
}

export function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    backHref,
    backLabel = "Volver",
    className,
    badge,
}: PageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("mb-6", className)}
        >
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    {breadcrumbs.map((item, index) => (
                        <span key={index} className="flex items-center gap-1">
                            {index > 0 && <ChevronRight className="w-4 h-4" />}
                            {item.href ? (
                                <Link
                                    href={item.href}
                                    className="hover:text-foreground transition-fast"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-foreground font-medium">{item.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}

            {/* Main header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                        {badge && (
                            <span className={cn(
                                "text-xs font-medium px-2.5 py-1 rounded-full",
                                badgeVariants[badge.variant || "default"]
                            )}>
                                {badge.label}
                            </span>
                        )}
                    </div>
                    {description && (
                        <p className="text-muted-foreground mt-1">{description}</p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {backHref && (
                        <Link href={backHref}>
                            <Button variant="outline" size="sm">
                                {backLabel}
                            </Button>
                        </Link>
                    )}
                    {actions}
                </div>
            </div>
        </motion.div>
    )
}

// Auto-generate breadcrumbs from path
export function useAutoBreadcrumbs(): BreadcrumbItem[] {
    const pathname = usePathname()

    const pathSegments = pathname.split("/").filter(Boolean)

    const breadcrumbs: BreadcrumbItem[] = []
    let currentPath = ""

    const labelMap: Record<string, string> = {
        dashboard: "Dashboard",
        admin: "Admin",
        teacher: "Profesor",
        student: "Estudiante",
        students: "Estudiantes",
        classrooms: "Aulas",
        classroom: "Aula",
        curriculum: "Currículum",
        institutions: "Instituciones",
        temas: "Temas",
        exercises: "Ejercicios",
        members: "Miembros",
        performance: "Rendimiento",
        import: "Importar",
    }

    for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        currentPath += `/${segment}`

        // Skip IDs (UUIDs)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)

        if (!isUuid) {
            const isLast = i === pathSegments.length - 1
            breadcrumbs.push({
                label: labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
                href: isLast ? undefined : currentPath,
            })
        }
    }

    return breadcrumbs
}
