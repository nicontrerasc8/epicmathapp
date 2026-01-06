"use client"

import { motion } from "framer-motion"
import { LucideIcon, Search, Inbox, AlertCircle, FileX2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyStateVariant = "no-data" | "no-results" | "error" | "custom"

interface EmptyStateProps {
    variant?: EmptyStateVariant
    icon?: LucideIcon
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
}

const defaultIcons: Record<EmptyStateVariant, LucideIcon> = {
    "no-data": Inbox,
    "no-results": Search,
    "error": AlertCircle,
    "custom": FileX2,
}

const defaultColors: Record<EmptyStateVariant, string> = {
    "no-data": "text-muted-foreground",
    "no-results": "text-primary",
    "error": "text-destructive",
    "custom": "text-muted-foreground",
}

export function EmptyState({
    variant = "no-data",
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    const Icon = icon || defaultIcons[variant]
    const iconColor = defaultColors[variant]

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
                "flex flex-col items-center justify-center py-12 px-6 text-center",
                className
            )}
        >
            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
                variant === "error" ? "bg-destructive/10" : "bg-muted"
            )}>
                <Icon className={cn("w-8 h-8", iconColor)} />
            </div>

            <h3 className="text-lg font-semibold mb-1">{title}</h3>

            {description && (
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    {description}
                </p>
            )}

            {action && (
                <Button onClick={action.onClick} variant="default" size="sm">
                    {action.label}
                </Button>
            )}
        </motion.div>
    )
}

// Specialized empty states
export function NoDataState({
    entityName = "datos",
    onAdd,
}: {
    entityName?: string
    onAdd?: () => void
}) {
    return (
        <EmptyState
            variant="no-data"
            title={`No hay ${entityName}`}
            description={`Aún no se han registrado ${entityName}. Comienza agregando uno nuevo.`}
            action={onAdd ? { label: `Agregar ${entityName}`, onClick: onAdd } : undefined}
        />
    )
}

export function NoResultsState({
    onClear
}: {
    onClear?: () => void
}) {
    return (
        <EmptyState
            variant="no-results"
            title="Sin resultados"
            description="No se encontraron elementos que coincidan con tu búsqueda. Intenta con otros filtros."
            action={onClear ? { label: "Limpiar filtros", onClick: onClear } : undefined}
        />
    )
}

export function ErrorState({
    message,
    onRetry
}: {
    message?: string
    onRetry?: () => void
}) {
    return (
        <EmptyState
            variant="error"
            title="Ocurrió un error"
            description={message || "No se pudo cargar la información. Por favor intenta de nuevo."}
            action={onRetry ? { label: "Reintentar", onClick: onRetry } : undefined}
        />
    )
}
