// lib/exercises/types.ts

export type TemaPeriodoRow = {
  id: string
  tema: string
  grado: number
  periodo_id: string | null
  school_id: string | null
}

export type StudentPeriodoRow = {
  id?: string
  student_id: string
  tema_periodo_id: string
  nivel: number
  theta: number
  aciertos: number
  errores: number
  streak: number
}
