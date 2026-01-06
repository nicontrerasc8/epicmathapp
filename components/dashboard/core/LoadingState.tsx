"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
    className?: string
}

function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn("animate-pulse bg-muted rounded", className)} />
    )
}

// Table skeleton with header
export function TableSkeleton({
    rows = 5,
    columns = 4
}: {
    rows?: number
    columns?: number
}) {
    return (
        <div className="rounded-xl border overflow-hidden">
            {/* Header */}
            <div className="bg-muted/50 p-3 flex gap-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>

            {/* Rows */}
            <div className="divide-y">
                {Array.from({ length: rows }).map((_, rowIdx) => (
                    <div key={rowIdx} className="p-3 flex gap-4 items-center">
                        {Array.from({ length: columns }).map((_, colIdx) => (
                            <Skeleton
                                key={colIdx}
                                className={cn(
                                    "h-4",
                                    colIdx === 0 ? "w-6" : "flex-1",
                                    colIdx === columns - 1 && "w-20"
                                )}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

// Card skeleton for stat cards
export function CardSkeleton() {
    return (
        <div className="rounded-2xl border bg-card p-5 animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-16" />
        </div>
    )
}

// Card grid skeleton
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    )
}

// Detail page skeleton
export function DetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-20 rounded-md" />
                    <Skeleton className="h-10 w-20 rounded-md" />
                </div>
            </div>

            {/* Content cards */}
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border bg-card p-5 space-y-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="rounded-2xl border bg-card p-5 space-y-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        </div>
    )
}

// Page loading
export function PageLoadingSkeleton() {
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>

            {/* Stats */}
            <CardGridSkeleton count={4} />

            {/* Table */}
            <TableSkeleton rows={5} columns={5} />
        </div>
    )
}

// Inline loading spinner
export function LoadingSpinner({ className }: { className?: string }) {
    return (
        <svg
            className={cn("animate-spin h-5 w-5 text-primary", className)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    )
}

// Full page loading
export function FullPageLoading() {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <LoadingSpinner className="h-8 w-8" />
                <span className="text-sm text-muted-foreground">Cargando...</span>
            </div>
        </div>
    )
}

export { Skeleton }
