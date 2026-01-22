"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Trophy, Flame, Timer, CheckCircle2, XCircle, Sparkles, Zap } from "lucide-react"
import { formatTime } from "@/lib/exercises/formatTime"
import type { GamificationRow } from "@/lib/exercises/useExerciseGamification"
import type { ExerciseStatus } from "./ExerciseShell"

function StatPill({
  icon,
  label,
  value,
  hint,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint?: string
  highlight?: boolean
}) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        relative overflow-hidden rounded-xl
        transition-all duration-300
    
      `}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`
          rounded-lg p-2 

        `}>
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium  uppercase tracking-wider">
            {label}
          </div>
          <div className={`
            text-lg font-bold tabular-nums
       
          `}>
            {value}
          </div>
        </div>
        
        {hint && (
          <div className="text-xs  px-2 py-1 rounded">
            {hint}
          </div>
        )}
      </div>
      
      {highlight && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        />
      )}
    </motion.div>
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
      }, 3500)
    }
    prevStatusRef.current = status

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [status])

  const confetti = useMemo(() => {
    const rnd = (min: number, max: number) =>
      min + Math.floor(Math.random() * (max - min + 1))
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: rnd(-160, 160),
      y: rnd(-200, -50),
      size: rnd(8, 16),
      delay: Math.random() * 0.3,
      rot: rnd(-90, 90),
      duration: 1.2 + Math.random() * 0.8,
    }))
  }, [celebrate])

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
  <div className="flex items-center justify-between rounded-lg border border-yellow-300 bg-yellow-100/50 px-4 py-2">
  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
    <Zap className="w-4 h-4 text-yellow-500" />
    Tu Progreso
  </h3>

  <StatPill
    icon={<Trophy className="w-5 h-5 text-yellow-500" />}
    label="Trofeos"
    value={gamiLoading ? "..." : gami?.trophies ?? 0}
    highlight={celebrate}
  />
</div>


     

        {/* Warning Messages */}
        <AnimatePresence>
          {!studentId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
            >
              <XCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-200">
                  Sesión no iniciada
                </p>
                <p className="text-xs text-amber-300/70 mt-0.5">
                  No se detectó usuario logueado. Los trofeos no se guardarán.
                </p>
              </div>
            </motion.div>
          )}

          {!gamiLoading && !gami && studentId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
            >
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-200">
                  Error de gamificación
                </p>
                <p className="text-xs text-red-300/70 mt-0.5">
                  No existe registro en edu_student_gamification.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Victory Celebration Modal */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="relative max-w-md w-full mx-4"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-2xl blur-2xl" />
              
              {/* Card */}
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
                
                <div className="relative p-8 text-center space-y-6">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-amber-500/50"
                  >
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </motion.div>

                  {/* Title */}
                  <div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent"
                    >
                      ¡Excelente!
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-slate-300 mt-2 text-lg"
                    >
                      ¡Haz sumado 30 puntos!
                    </motion.p>
                  </div>

           
                </div>
              </div>

              {/* Confetti */}
              {confetti.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute top-1/2 left-1/2 rounded-sm"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: [
                      "#fbbf24",
                      "#f59e0b",
                      "#fb923c",
                      "#ef4444",
                      "#ec4899",
                    ][p.id % 5],
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    opacity: 0,
                    rotate: p.rot,
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}