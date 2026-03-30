export type ExamPerformanceColor = "green" | "blue" | "yellow" | "red"

export function getExamEffectivenessPercentage({
  score,
  correctCount,
  wrongCount,
}: {
  score?: number | null | undefined
  correctCount?: number | null | undefined
  wrongCount?: number | null | undefined
}) {
  const correct = Number(correctCount ?? 0)
  const wrong = Number(wrongCount ?? 0)
  const total = correct + wrong

  if (total > 0) {
    return Number(((correct / total) * 100).toFixed(1))
  }

  if (score == null) return null
  return Number(score)
}

export function getExamPerformanceColor(score: number | null | undefined): ExamPerformanceColor {
  if (score == null) return "red"
  if (score >= 75) return "green"
  if (score >= 50) return "blue"
  if (score >= 25) return "yellow"
  return "red"
}

export function getExamPerformanceLabel(score: number | null | undefined) {
  const color = getExamPerformanceColor(score)

  if (score == null) return "Sin evidencia"
  if (color === "green") return "Dominio alto"
  if (color === "blue") return "Buen avance"
  if (color === "yellow") return "En refuerzo"
  return "Riesgo alto"
}

export function getExamPerformanceClasses(color: ExamPerformanceColor) {
  if (color === "green") {
    return "border-emerald-300 bg-emerald-500/20 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
  }
  if (color === "blue") {
    return "border-sky-300 bg-sky-500/20 text-sky-900 dark:border-sky-800 dark:bg-sky-500/20 dark:text-sky-200"
  }
  if (color === "yellow") {
    return "border-amber-300 bg-amber-500/20 text-amber-900 dark:border-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
  }
  return "border-rose-300 bg-rose-500/20 text-rose-900 dark:border-rose-800 dark:bg-rose-500/20 dark:text-rose-200"
}
