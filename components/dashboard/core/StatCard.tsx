"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
    title: string
    value: number | string
    trend?: {
        value: number
        label?: string
    }
    icon?: LucideIcon
    variant?: "default" | "primary" | "success" | "warning" | "danger"
    loading?: boolean
    className?: string
    suffix?: string
    prefix?: string
}

const variantStyles = {
    default: {
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground",
        trendUp: "text-secondary",
        trendDown: "text-destructive",
    },
    primary: {
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        trendUp: "text-secondary",
        trendDown: "text-destructive",
    },
    success: {
        iconBg: "bg-secondary/10",
        iconColor: "text-secondary",
        trendUp: "text-secondary",
        trendDown: "text-destructive",
    },
    warning: {
        iconBg: "bg-accent/20",
        iconColor: "text-accent-foreground",
        trendUp: "text-secondary",
        trendDown: "text-destructive",
    },
    danger: {
        iconBg: "bg-destructive/10",
        iconColor: "text-destructive",
        trendUp: "text-secondary",
        trendDown: "text-destructive",
    },
}

function StatCardSkeleton() {
    return (
        <div className="rounded-2xl border bg-card p-5 animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-10 w-10 bg-muted rounded-xl" />
            </div>
            <div className="h-8 w-20 bg-muted rounded mb-2" />
            <div className="h-4 w-16 bg-muted rounded" />
        </div>
    )
}

export function StatCard({
    title,
    value,
    trend,
    icon: Icon,
    variant = "default",
    loading = false,
    className,
    suffix = "",
    prefix = "",
}: StatCardProps) {
    if (loading) return <StatCardSkeleton />

    const styles = variantStyles[variant]

    const TrendIcon = trend
        ? trend.value > 0
            ? TrendingUp
            : trend.value < 0
                ? TrendingDown
                : Minus
        : null

    const trendColor = trend
        ? trend.value > 0
            ? styles.trendUp
            : trend.value < 0
                ? styles.trendDown
                : "text-muted-foreground"
        : ""

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
                "rounded-2xl border bg-card p-5 shadow-card hover:shadow-card-hover transition-normal",
                className
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                {Icon && (
                    <div className={cn("p-2.5 rounded-xl", styles.iconBg)}>
                        <Icon className={cn("w-5 h-5", styles.iconColor)} />
                    </div>
                )}
            </div>

            <div className="flex items-baseline gap-1 mb-1">
                {prefix && <span className="text-lg text-muted-foreground">{prefix}</span>}
                <motion.span
                    key={String(value)}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-bold tracking-tight"
                >
                    {typeof value === "number" ? value.toLocaleString() : value}
                </motion.span>
                {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
            </div>

            {trend && (
                <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                    {TrendIcon && <TrendIcon className="w-4 h-4" />}
                    <span className="font-medium">
                        {trend.value > 0 ? "+" : ""}
                        {trend.value}%
                    </span>
                    {trend.label && (
                        <span className="text-muted-foreground">{trend.label}</span>
                    )}
                </div>
            )}
        </motion.div>
    )
}

// Grid wrapper for multiple stat cards
interface StatCardGridProps {
    children: ReactNode
    columns?: 2 | 3 | 4
    className?: string
}

export function StatCardGrid({
    children,
    columns = 4,
    className
}: StatCardGridProps) {
    const colClasses = {
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    }

    return (
        <div className={cn("grid gap-4", colClasses[columns], className)}>
            {children}
        </div>
    )
}
