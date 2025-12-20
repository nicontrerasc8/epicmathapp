'use client'

import { StudentPeriodoRow, TemaPeriodoRow } from "@/lib/exercises/types"



export function NotImplementedExercise({
  temaPeriodo,
}: {
  temaPeriodo: TemaPeriodoRow
  temaPeriodoId: string
  studentPeriodo: StudentPeriodoRow
  studentId: string
}) {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-3xl bg-card border rounded-2xl p-6">
        <h1 className="text-2xl font-bold">{temaPeriodo.tema}</h1>
        <p className="mt-2 text-muted-foreground">
          Aún no hay ejercicio implementado para este tema.
        </p>
      </div>
    </div>
  )
}
