"use client"

import { motion } from "framer-motion"
import { CheckCircle2, XCircle } from "lucide-react"
import type { ExerciseStatus } from "@/lib/exercises/useExerciseEngine"

export type Option = {
  value: string
  correct: boolean
}

export function OptionsGrid({
  options,
  selectedValue,
  status,
  canAnswer,
  onSelect,
  renderValue,
}: {
  options: Option[]
  selectedValue: string | null
  status: ExerciseStatus
  canAnswer: boolean
  onSelect: (option: Option) => void
  renderValue?: (option: Option) => React.ReactNode
}) {
  const hasCustomValue = Boolean(renderValue)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {options.map((op) => {
        const isSelected = selectedValue === op.value
        const showCorrect = status !== "idle" && op.correct
        const showWrong = status === "revealed" && isSelected && !op.correct
        return (
          <motion.button
            key={op.value}
            type="button"
            disabled={!canAnswer}
            onClick={() => onSelect(op)}
            whileHover={canAnswer ? { y: -2 } : undefined}
            whileTap={canAnswer ? { scale: 0.99 } : undefined}
            className={[
              "relative overflow-hidden rounded-2xl border p-4 text-left transition",
              "bg-card hover:shadow-sm",
              isSelected && "ring-2 ring-primary",
              showCorrect && "border-green-500/40 bg-green-500/10",
              showWrong && "border-red-500/40 bg-red-500/10",
              !canAnswer && "opacity-80 cursor-not-allowed",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                {showCorrect ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-xs">
                    <CheckCircle2 className="h-4 w-4" /> Correcta
                  </span>
                ) : showWrong ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-xs">
                    <XCircle className="h-4 w-4" /> Incorrecta
                  </span>
                ) : null}
              </div>

              <div
                className={
                  hasCustomValue
                    ? "mt-2 overflow-hidden text-xl font-semibold leading-tight"
                    : "mt-2 font-mono text-2xl font-semibold tracking-wide"
                }
              >
                {renderValue ? renderValue(op) : op.value}
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
