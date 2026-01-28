"use client"

import { useContext } from "react"
import { GlobalLayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"

export default function RouteChangeIndicator() {
  const routerState = useContext(GlobalLayoutRouterContext)
  const isLoading = Boolean(routerState?.nextUrl)

  if (!isLoading) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
      <div className="relative flex flex-col items-center gap-4 text-xs font-semibold text-foreground">
        <div className="h-2 w-28 overflow-hidden rounded-full border border-primary/40 bg-primary/10">
          <div className="h-full w-full animate-[loading-bar_1.2s_ease-in-out_infinite] bg-gradient-to-r from-primary to-primary/60" />
        </div>
        <span>Cargando página...</span>
      </div>
    </div>
  )
}
