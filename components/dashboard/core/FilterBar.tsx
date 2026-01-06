"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, ChevronDown, Check, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type FilterType = "search" | "select" | "multi-select" | "toggle"

export interface FilterOption {
    value: string
    label: string
}

export interface FilterConfig {
    key: string
    type: FilterType
    label: string
    placeholder?: string
    options?: FilterOption[]
}

export interface FilterBarProps {
    filters: FilterConfig[]
    values: Record<string, any>
    onChange: (key: string, value: any) => void
    onClear: () => void
    className?: string
    debounceMs?: number
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Search input with debounce
function SearchFilter({
    config,
    value,
    onChange,
    debounceMs = 300,
}: {
    config: FilterConfig
    value: string
    onChange: (value: string) => void
    debounceMs?: number
}) {
    const [localValue, setLocalValue] = useState(value || "")

    useEffect(() => {
        setLocalValue(value || "")
    }, [value])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue)
            }
        }, debounceMs)

        return () => clearTimeout(timer)
    }, [localValue, debounceMs, onChange, value])

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={config.placeholder || "Buscar..."}
                className="pl-10 pr-8 h-9 w-full md:w-64"
            />
            {localValue && (
                <button
                    onClick={() => {
                        setLocalValue("")
                        onChange("")
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    )
}

// Select dropdown
function SelectFilter({
    config,
    value,
    onChange,
}: {
    config: FilterConfig
    value: string
    onChange: (value: string) => void
}) {
    const [open, setOpen] = useState(false)

    const selectedOption = config.options?.find((o) => o.value === value)

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center gap-2 h-9 px-3 rounded-md border bg-background text-sm",
                    "hover:bg-muted transition-fast",
                    value && "border-primary"
                )}
            >
                <span className={cn(value ? "text-foreground" : "text-muted-foreground")}>
                    {selectedOption?.label || config.label}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 top-full left-0 mt-1 min-w-[180px] rounded-lg border bg-card shadow-lg overflow-hidden"
                        >
                            <button
                                onClick={() => {
                                    onChange("")
                                    setOpen(false)
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                                    "hover:bg-muted transition-fast",
                                    !value && "bg-muted"
                                )}
                            >
                                <span className="text-muted-foreground">Todos</span>
                            </button>
                            {config.options?.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value)
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left",
                                        "hover:bg-muted transition-fast",
                                        value === option.value && "bg-muted"
                                    )}
                                >
                                    <span>{option.label}</span>
                                    {value === option.value && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

// Toggle filter (e.g., active/inactive)
function ToggleFilter({
    config,
    value,
    onChange,
}: {
    config: FilterConfig
    value: string
    onChange: (value: string) => void
}) {
    const options = config.options || [
        { value: "", label: "Todos" },
        { value: "true", label: "Activo" },
        { value: "false", label: "Inactivo" },
    ]

    return (
        <div className="flex rounded-lg border overflow-hidden">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "px-3 py-1.5 text-sm transition-fast",
                        value === option.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function FilterBar({
    filters,
    values,
    onChange,
    onClear,
    className,
    debounceMs = 300,
}: FilterBarProps) {
    const activeFilterCount = useMemo(() => {
        return Object.values(values).filter((v) => v !== "" && v !== undefined && v !== null).length
    }, [values])

    const renderFilter = useCallback(
        (config: FilterConfig) => {
            const value = values[config.key] ?? ""

            switch (config.type) {
                case "search":
                    return (
                        <SearchFilter
                            key={config.key}
                            config={config}
                            value={value}
                            onChange={(v) => onChange(config.key, v)}
                            debounceMs={debounceMs}
                        />
                    )
                case "select":
                    return (
                        <SelectFilter
                            key={config.key}
                            config={config}
                            value={value}
                            onChange={(v) => onChange(config.key, v)}
                        />
                    )
                case "toggle":
                    return (
                        <ToggleFilter
                            key={config.key}
                            config={config}
                            value={value}
                            onChange={(v) => onChange(config.key, v)}
                        />
                    )
                default:
                    return null
            }
        },
        [values, onChange, debounceMs]
    )

    return (
        <div className={cn("flex flex-wrap items-center gap-3 mb-4", className)}>
            {filters.map(renderFilter)}

            {activeFilterCount > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <X className="w-4 h-4 mr-1" />
                    Limpiar ({activeFilterCount})
                </Button>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// HOOK: useFilters
// ═══════════════════════════════════════════════════════════════

export function useFilters<T extends Record<string, any>>(initialValues: T) {
    const [values, setValues] = useState<T>(initialValues)

    const onChange = useCallback((key: string, value: any) => {
        setValues((prev) => ({ ...prev, [key]: value }))
    }, [])

    const onClear = useCallback(() => {
        setValues(initialValues)
    }, [initialValues])

    return { values, onChange, onClear, setValues }
}
