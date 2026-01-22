"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Trophy, Flame, Timer, CheckCircle2, XCircle, Sparkles } from "lucide-react"
import { formatTime } from "@/lib/exercises/formatTime"
import type { GamificationRow } from "@/lib/exercises/useExerciseGamification"
import type { ExerciseStatus } from "./ExerciseShell"

function StatPill({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border bg-background">
          {icon}
        </span>
        <div className="flex-1">
          <div className="font-medium">{label}</div>
          {hint ? <div className="text-[11px] opacity-80">{hint}</div> : null}
        </div>
        <div className="text-base font-semibold text-foreground">{value}</div>
      </div>
    </div>
  )
}

export function ExerciseHud({
  elapsed,
  trophyPreview,
  gami,
  gamiLoading,
  studentId,
  wrongPenalty,
  status,
}: {
  elapsed: number
  trophyPreview: number
  gami: GamificationRow | null
  gamiLoading: boolean
  studentId: string | null
  wrongPenalty: number
  status: ExerciseStatus
}) {
  const [celebrate, setCelebrate] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const prevStatusRef = useRef<ExerciseStatus>("idle")

  useEffect(() => {
    const prev = prevStatusRef.current
    if (status === "ok" && prev !== "ok") {
      setCelebrate(true)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => {
        setCelebrate(false)
      }, 1600)
    }
    prevStatusRef.current = status
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [status])

  const confetti = useMemo(() => {
    const rnd = (min: number, max: number) =>
      min + Math.floor(Math.random() * (max - min + 1))
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: rnd(-140, 140),
      y: rnd(-180, -40),
      size: rnd(6, 12),
      delay: Math.random() * 0.2,
      rot: rnd(-60, 60),
    }))
  }, [celebrate])

  return (
    <>
      <div className="order-first rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Tu progreso</div>
          <div className="text-lg font-semibold">Arena de Trofeos</div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
          <Trophy className="h-4 w-4" />
          <span className="font-semibold">
            {gamiLoading ? "-" : gami?.trophies ?? 0}
          </span>
        </div>
      </div>


      {!studentId ? (
        <div className="mt-3 rounded-xl border bg-background p-3 text-xs text-muted-foreground">
          No se detecto usuario logueado. Los trofeos no se guardaran.
        </div>
      ) : !gamiLoading && !gami ? (
        <div className="mt-3 rounded-xl border bg-background p-3 text-xs text-muted-foreground">
          No existe fila en <span className="font-mono">edu_student_gamification</span>.
        </div>
      ) : null}
      </div>

      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-3xl border bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-200 p-6 shadow-2xl"
              initial={{ scale: 0.7, rotate: -4, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
            >
              <div className="absolute -top-10 left-1/2 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full bg-yellow-300 shadow-xl">
                <Trophy className="h-9 w-9 text-amber-900" />
              </div>

              <div className="absolute right-4 top-4 rounded-full bg-amber-100/70 p-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
              </div>

              <div className="mt-6 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
                  Victoria
                </div>
                <div className="mt-2 text-3xl font-black text-amber-900">
                  Perfecto!
                </div>
                <div className="mt-2 text-sm text-amber-800">
                  +{trophyPreview} trofeos y racha al maximo
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-amber-200 bg-white/70 p-2 text-xs text-amber-900">
                  Tiempo
                  <div className="text-sm font-semibold">{formatTime(elapsed)}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white/70 p-2 text-xs text-amber-900">
                  Trofeos
                  <div className="text-sm font-semibold">+{trophyPreview}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white/70 p-2 text-xs text-amber-900">
                  Racha
                  <div className="text-sm font-semibold">
                    {gamiLoading ? "-" : gami?.streak ?? 0}
                  </div>
                </div>
              </div>

              <motion.div
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {confetti.map(p => (
                  <motion.span
                    key={p.id}
                    className="absolute left-1/2 top-1/2 rounded-full bg-amber-400/70"
                    style={{ width: p.size, height: p.size }}
                    initial={{ x: 0, y: 0, scale: 0.7, rotate: 0, opacity: 0 }}
                    animate={{
                      x: p.x,
                      y: p.y,
                      scale: [0.7, 1.1, 0.6],
                      rotate: p.rot,
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 1.0, delay: p.delay, ease: "easeOut" }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
