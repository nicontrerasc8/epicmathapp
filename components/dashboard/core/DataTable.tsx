"use client"

import { useState, useMemo, ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { TableSkeleton } from "./LoadingState"
import { NoDataState, NoResultsState } from "./EmptyState"
import { cn } from "@/lib/utils"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ColumnDef<T> {
    key: string
    header: string
    width?: string
    sortable?: boolean
    align?: "left" | "center" | "right"
    render?: (value: any, row: T) => ReactNode
}

export interface BulkAction {
    label: string
    icon?: ReactNode
    variant?: "default" | "destructive"
    onClick: (selectedIds: string[]) => void | Promise<void>
}

export interface PaginationConfig {
    page: number
    pageSize: number
    total: number
}

export interface DataTableProps<T extends { id: string }> {
    columns: ColumnDef<T>[]
    data: T[]
    loading?: boolean
    emptyState?: {
        title: string
        description?: string
    }
    isFiltered?: boolean
    onClearFilters?: () => void

    // Selection
    selectable?: boolean
    onSelectionChange?: (ids: string[]) => void
    bulkActions?: BulkAction[]

    // Sorting
    sortKey?: string
    sortDir?: "asc" | "desc"
    onSort?: (key: string, dir: "asc" | "desc") => void

    // Pagination
    pagination?: PaginationConfig
    onPageChange?: (page: number) => void

    // Row actions
    rowActions?: (row: T) => ReactNode
    onRowClick?: (row: T) => void

    className?: string
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SortIcon({
    active,
    dir
}: {
    active: boolean
    dir?: "asc" | "desc"
}) {
    if (!active) {
        return <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />
    }
    return dir === "asc"
        ? <ChevronUp className="w-4 h-4 text-primary" />
        : <ChevronDown className="w-4 h-4 text-primary" />
}

function BulkActionsBar({
    selectedCount,
    actions,
    onClear,
}: {
    selectedCount: number
    actions: BulkAction[]
    onClear: () => void
}) {
    if (selectedCount === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-3"
        >
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                    {selectedCount} seleccionado{selectedCount > 1 ? "s" : ""}
                </span>
                <button
                    onClick={onClear}
                    className="text-sm text-muted-foreground hover:text-foreground transition-fast"
                >
                    Limpiar
                </button>
            </div>
            <div className="flex items-center gap-2">
                {actions.map((action, i) => (
                    <Button
                        key={i}
                        variant={action.variant === "destructive" ? "destructive" : "secondary"}
                        size="sm"
                        onClick={() => action.onClick}
                    >
                        {action.icon}
                        {action.label}
                    </Button>
                ))}
            </div>
        </motion.div>
    )
}

function Pagination({
    pagination,
    onPageChange,
}: {
    pagination: PaginationConfig
    onPageChange: (page: number) => void
}) {
    const totalPages = Math.ceil(pagination.total / pagination.pageSize)
    const from = (pagination.page - 1) * pagination.pageSize + 1
    const to = Math.min(pagination.page * pagination.pageSize, pagination.total)

    if (totalPages <= 1) return null

    return (
        <div className="flex items-center justify-between px-2 py-3 border-t">
            <span className="text-sm text-muted-foreground">
                {from}-{to} de {pagination.total}
            </span>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={pagination.page <= 1}
                    onClick={() => onPageChange(pagination.page - 1)}
                    className="h-8 w-8"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                        pageNum = i + 1
                    } else if (pagination.page <= 3) {
                        pageNum = i + 1
                    } else if (pagination.page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                    } else {
                        pageNum = pagination.page - 2 + i
                    }

                    return (
                        <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? "default" : "ghost"}
                            size="icon"
                            onClick={() => onPageChange(pageNum)}
                            className="h-8 w-8"
                        >
                            {pageNum}
                        </Button>
                    )
                })}

                <Button
                    variant="ghost"
                    size="icon"
                    disabled={pagination.page >= totalPages}
                    onClick={() => onPageChange(pagination.page + 1)}
                    className="h-8 w-8"
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DataTable<T extends { id: string }>({
    columns,
    data,
    loading = false,
    emptyState,
    isFiltered = false,
    onClearFilters,
    selectable = false,
    onSelectionChange,
    bulkActions = [],
    sortKey,
    sortDir,
    onSort,
    pagination,
    onPageChange,
    rowActions,
    onRowClick,
    className,
}: DataTableProps<T>) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Handle selection
    const toggleRow = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
        onSelectionChange?.(Array.from(newSet))
    }

    const toggleAll = () => {
        if (selectedIds.size === data.length) {
            setSelectedIds(new Set())
            onSelectionChange?.([])
        } else {
            const allIds = new Set(data.map((row) => row.id))
            setSelectedIds(allIds)
            onSelectionChange?.(Array.from(allIds))
        }
    }

    const clearSelection = () => {
        setSelectedIds(new Set())
        onSelectionChange?.([])
    }

    // Handle sort
    const handleSort = (key: string) => {
        if (!onSort) return
        const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc"
        onSort(key, newDir)
    }

    // Render
    if (loading) {
        return <TableSkeleton rows={5} columns={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} />
    }

    if (data.length === 0) {
        if (isFiltered && onClearFilters) {
            return <NoResultsState onClear={onClearFilters} />
        }
        return (
            <NoDataState
                entityName={emptyState?.title || "datos"}
            />
        )
    }

    const allSelected = selectedIds.size === data.length && data.length > 0
    const someSelected = selectedIds.size > 0 && selectedIds.size < data.length

    return (
        <div className={cn("rounded-xl border bg-card", className)}>
            {/* Bulk actions bar */}
            <AnimatePresence>
                {selectable && selectedIds.size > 0 && (
                    <BulkActionsBar
                        selectedCount={selectedIds.size}
                        actions={bulkActions}
                        onClear={clearSelection}
                    />
                )}
            </AnimatePresence>

            {/* Table */}
            <div >
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            {/* Checkbox column */}
                            {selectable && (
                                <th className="w-12 p-3">
                                    <Checkbox
                                        checked={allSelected}
                                        // @ts-ignore
                                        indeterminate={someSelected}
                                        onCheckedChange={toggleAll}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </th>
                            )}

                            {/* Data columns */}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{ width: col.width }}
                                    className={cn(
                                        "p-3 font-medium text-muted-foreground",
                                        col.align === "center" && "text-center",
                                        col.align === "right" && "text-right",
                                        col.sortable && "cursor-pointer select-none hover:text-foreground transition-fast"
                                    )}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className={cn(
                                        "flex items-center gap-1",
                                        col.align === "center" && "justify-center",
                                        col.align === "right" && "justify-end"
                                    )}>
                                        {col.header}
                                        {col.sortable && (
                                            <SortIcon active={sortKey === col.key} dir={sortKey === col.key ? sortDir : undefined} />
                                        )}
                                    </div>
                                </th>
                            ))}

                            {/* Actions column */}
                            {rowActions && (
                                <th className="w-16 p-3" />
                            )}
                        </tr>
                    </thead>

                    <tbody className="divide-y">
                        {data.map((row, rowIdx) => (
                            <motion.tr
                                key={row.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: rowIdx * 0.02 }}
                                className={cn(
                                    "hover:bg-muted/30 transition-fast",
                                    selectedIds.has(row.id) && "bg-primary/5",
                                    onRowClick && "cursor-pointer"
                                )}
                                onClick={() => onRowClick?.(row)}
                            >
                                {/* Checkbox */}
                                {selectable && (
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedIds.has(row.id)}
                                            onCheckedChange={() => toggleRow(row.id)}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </td>
                                )}

                                {/* Data cells */}
                                {columns.map((col) => {
                                    const value = (row as any)[col.key]
                                    return (
                                        <td
                                            key={col.key}
                                            className={cn(
                                                "p-3",
                                                col.align === "center" && "text-center",
                                                col.align === "right" && "text-right"
                                            )}
                                        >
                                            {col.render ? col.render(value, row) : value ?? "—"}
                                        </td>
                                    )
                                })}

                                {/* Row actions */}
                                {rowActions && (
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                        {rowActions(row)}
                                    </td>
                                )}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && onPageChange && (
                <Pagination pagination={pagination} onPageChange={onPageChange} />
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════

export function StatusBadge({
    active,
    activeLabel = "Activo",
    inactiveLabel = "Inactivo"
}: {
    active: boolean
    activeLabel?: string
    inactiveLabel?: string
}) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
            active
                ? "bg-secondary/10 text-secondary"
                : "bg-muted text-muted-foreground"
        )}>
            <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                active ? "bg-secondary" : "bg-muted-foreground"
            )} />
            {active ? activeLabel : inactiveLabel}
        </span>
    )
}

// ═══════════════════════════════════════════════════════════════
// ROW ACTIONS DROPDOWN
// ═══════════════════════════════════════════════════════════════

interface RowAction {
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: "default" | "destructive"
}

export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(!open)}
            >
                <MoreHorizontal className="w-4 h-4" />
            </Button>

            <AnimatePresence>
                {open && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="absolute z-50 right-0 top-full mt-1 min-w-[160px] rounded-lg border bg-card shadow-lg overflow-hidden"
                        >
                            {actions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        action.onClick()
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                                        "hover:bg-muted transition-fast",
                                        action.variant === "destructive" && "text-destructive hover:bg-destructive/10"
                                    )}
                                >
                                    {action.icon}
                                    {action.label}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
