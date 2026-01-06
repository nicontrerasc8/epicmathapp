"use client"

import { useEffect, useRef } from "react"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartOptions,
    ChartData,
} from "chart.js"
import { Line, Bar, Doughnut } from "react-chartjs-2"
import { cn } from "@/lib/utils"

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

// ═══════════════════════════════════════════════════════════════
// THEME COLORS
// ═══════════════════════════════════════════════════════════════

export const chartColors = {
    primary: "rgb(59, 130, 246)",
    primaryLight: "rgba(59, 130, 246, 0.1)",
    secondary: "rgb(16, 185, 129)",
    secondaryLight: "rgba(16, 185, 129, 0.1)",
    accent: "rgb(250, 204, 21)",
    accentLight: "rgba(250, 204, 21, 0.2)",
    destructive: "rgb(239, 68, 68)",
    destructiveLight: "rgba(239, 68, 68, 0.1)",
    muted: "rgb(107, 114, 128)",
    mutedLight: "rgba(107, 114, 128, 0.1)",
    grid: "rgba(0, 0, 0, 0.05)",
}

// ═══════════════════════════════════════════════════════════════
// BASE OPTIONS
// ═══════════════════════════════════════════════════════════════

const baseOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            backgroundColor: "white",
            titleColor: "#111827",
            bodyColor: "#6B7280",
            borderColor: "#E5E7EB",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
        },
    },
    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                color: "#9CA3AF",
            },
        },
        y: {
            grid: {
                color: chartColors.grid,
            },
            ticks: {
                color: "#9CA3AF",
            },
        },
    },
}

// ═══════════════════════════════════════════════════════════════
// LINE CHART
// ═══════════════════════════════════════════════════════════════

interface LineChartProps {
    data: {
        labels: string[]
        values: number[]
        label?: string
    }
    height?: number
    showArea?: boolean
    color?: "primary" | "secondary" | "accent"
    className?: string
}

export function LineChart({
    data,
    height = 250,
    showArea = true,
    color = "primary",
    className,
}: LineChartProps) {
    const colorMap = {
        primary: { line: chartColors.primary, fill: chartColors.primaryLight },
        secondary: { line: chartColors.secondary, fill: chartColors.secondaryLight },
        accent: { line: chartColors.accent, fill: chartColors.accentLight },
    }

    const chartData: ChartData<"line"> = {
        labels: data.labels,
        datasets: [
            {
                label: data.label || "Datos",
                data: data.values,
                borderColor: colorMap[color].line,
                backgroundColor: showArea ? colorMap[color].fill : "transparent",
                fill: showArea,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: colorMap[color].line,
            },
        ],
    }

    return (
        <div className={cn("w-full", className)} style={{ height }}>
            <Line data={chartData} options={baseOptions} />
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// BAR CHART
// ═══════════════════════════════════════════════════════════════

interface BarChartProps {
    data: {
        labels: string[]
        values: number[]
        label?: string
    }
    height?: number
    color?: "primary" | "secondary" | "accent"
    horizontal?: boolean
    className?: string
}

export function BarChart({
    data,
    height = 250,
    color = "primary",
    horizontal = false,
    className,
}: BarChartProps) {
    const colorMap = {
        primary: chartColors.primary,
        secondary: chartColors.secondary,
        accent: chartColors.accent,
    }

    const chartData: ChartData<"bar"> = {
        labels: data.labels,
        datasets: [
            {
                label: data.label || "Datos",
                data: data.values,
                backgroundColor: colorMap[color],
                borderRadius: 6,
                maxBarThickness: 40,
            },
        ],
    }

    const options: ChartOptions<"bar"> = {
        ...baseOptions,
        indexAxis: horizontal ? "y" : "x",
    }

    return (
        <div className={cn("w-full", className)} style={{ height }}>
            <Bar data={chartData} options={options} />
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// DOUGHNUT CHART
// ═══════════════════════════════════════════════════════════════

interface DoughnutChartProps {
    data: {
        labels: string[]
        values: number[]
    }
    height?: number
    colors?: string[]
    showLegend?: boolean
    className?: string
}

export function DoughnutChart({
    data,
    height = 200,
    colors = [chartColors.primary, chartColors.secondary, chartColors.accent, chartColors.muted],
    showLegend = true,
    className,
}: DoughnutChartProps) {
    const chartData: ChartData<"doughnut"> = {
        labels: data.labels,
        datasets: [
            {
                data: data.values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4,
            },
        ],
    }

    const options: ChartOptions<"doughnut"> = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
            legend: {
                display: showLegend,
                position: "right",
                labels: {
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: "circle",
                },
            },
            tooltip: {
                backgroundColor: "white",
                titleColor: "#111827",
                bodyColor: "#6B7280",
                borderColor: "#E5E7EB",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
            },
        },
    }

    return (
        <div className={cn("w-full", className)} style={{ height }}>
            <Doughnut data={chartData} options={options} />
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CHART CARD WRAPPER
// ═══════════════════════════════════════════════════════════════

interface ChartCardProps {
    title: string
    subtitle?: string
    children: React.ReactNode
    className?: string
}

export function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
    return (
        <div className={cn("rounded-2xl border bg-card p-5", className)}>
            <div className="mb-4">
                <h3 className="font-semibold">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
            </div>
            {children}
        </div>
    )
}
