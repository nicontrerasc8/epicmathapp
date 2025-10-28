import { createClient } from '@/utils/supabase/client'
export type BuiltQuestion = {
  timeLimit: number
  toleranceAbs: number
  tolerancePct: number
  enunciado: string
  respuesta: number
  unidades: string
  explicacion: string
  hints: string[]
  meta: any
  canvas: CanvasSpec | null
}

export type CanvasSpec = {
  width?: number; height?: number; bg?: string;
  ops: any[]; // ver renderer
}

function withinTolerance(val: number, truth: number, absTol: number, pctTol: number) {
  const absOk = Math.abs(val - truth) <= absTol
  const relOk = Math.abs(val - truth) <= Math.abs(truth) * pctTol
  return absOk || relOk
}

// ... evalExpr, sampleParam, renderTemplate iguales ...

export async function buildQuestionFromDB(temaPeriodoId: string, studentId: string): Promise<BuiltQuestion> {
  const supabase = createClient()

  const { data: sp } = await supabase
    .from('student_periodo')
    .select('nivel')
    .eq('student_id', studentId)
    .eq('tema_periodo_id', temaPeriodoId)
    .maybeSingle()
  const nivel = (sp?.nivel ?? 1) as 1|2|3

  const { data: rules } = await supabase
    .from('rules')
    .select('id, dsl')
    .eq('tema_periodo_id', temaPeriodoId)
    .eq('nivel', nivel)
    .eq('enabled', true)
    .limit(10)

  if (!rules || rules.length === 0) throw new Error('No hay reglas para este tema/nivel')

  const rule = rules[Math.floor(Math.random()*rules.length)]
  const dsl = rule.dsl as any

  const vals: Record<string, number> = {}
  for (const [k, def] of Object.entries(dsl.params || {})) vals[k] = sampleParam(def)

  for (const [k, expr] of Object.entries(dsl.derived || {})) vals[k] = evalExpr(String(expr), vals)

  const answer = dsl.answer?.value ?? evalExpr(String(dsl.answer?.expr ?? '0'), vals)

  return {
    timeLimit: dsl.time_limit ?? 90,
    toleranceAbs: dsl.tolerance_abs ?? 0.5,
    tolerancePct: dsl.tolerance_pct ?? 0.02,
    enunciado: renderTemplate(dsl.question, vals),
    respuesta: answer,
    unidades: dsl.units || '',
    explicacion: dsl.explanation ? renderTemplate(dsl.explanation, vals) : '',
    hints: dsl.hints ?? [],
    meta: { nivel, ...vals },
    canvas: dsl.canvas ?? null
  }
}

export function checkAnswer(userVal: number, built: BuiltQuestion) {
  return withinTolerance(userVal, built.respuesta, built.toleranceAbs, built.tolerancePct)
}
