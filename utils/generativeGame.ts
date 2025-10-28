import { createClient } from '@/utils/supabase/client'

export type Nivel = 1 | 2 | 3

export type DSL = {
  schema: 'mx.v1'
  engine: 'numeric_one_answer'
  topic?: string
  time_limit?: number
  units?: string
  tolerance?: number
  params: Record<string, any>
  derived?: Record<string, string>
  question: string
  explanation?: string
  answer: { expr?: string; value?: number; }
  hints?: string[]
  canvas?: { kind: string; vars?: string[] }
}

export type Pregunta = {
  enunciado: string
  respuesta: number
  unidades: string
  explicacion: string
  meta: Record<string, any>
}

/** =============== HELPERS =============== **/

const toRad = (deg: number) => (deg * Math.PI) / 180
const round2 = (x: number) => Math.round(x * 100) / 100
const randi = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

function evalExpr(expr: string, scope: Record<string, number>): number {
  // Evaluador controlado: solo funciones matemáticas seguras
  const fns = {
    sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    min: Math.min, max: Math.max, abs: Math.abs, rad: toRad
  }
  const args = { ...fns, ...scope }
  const argNames = Object.keys(args)
  const argVals = Object.values(args)
  return Function(...argNames, `return ${expr}`)(...argVals)
}

function sampleParams(params: Record<string, any>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, def] of Object.entries(params || {})) {
    if (Array.isArray(def)) {
      const [min, max] = def
      out[k] = randi(min, max)
    } else if (typeof def === 'object' && 'values' in def) {
      const vals = (def as any).values as number[]
      out[k] = vals[Math.floor(Math.random() * vals.length)]
    } else {
      out[k] = Number(def)
    }
  }
  return out
}

function interpolate(template: string, scope: Record<string, number>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const val = scope[key.trim()]
    return typeof val === 'number' ? round2(val).toString() : String(val ?? '')
  })
}

/** =============== BUILDER PRINCIPAL =============== **/

function buildPreguntaGeneric(rule: DSL, nivel: Nivel): Pregunta {
  const v = sampleParams(rule.params)
  const derived: Record<string, number> = {}

  for (const [k, expr] of Object.entries(rule.derived || {})) {
    try {
      derived[k] = evalExpr(expr, { ...v, ...derived })
    } catch {
      derived[k] = NaN
    }
  }

  const scope = { ...v, ...derived }
  const respuesta = rule.answer.expr
    ? evalExpr(rule.answer.expr, scope)
    : (rule.answer.value ?? 0)

  return {
    enunciado: interpolate(rule.question, scope),
    respuesta: round2(respuesta),
    unidades: rule.units ?? '',
    explicacion: interpolate(rule.explanation ?? '', scope),
    meta: { nivel, ...scope, canvas: rule.canvas ?? {} }
  }
}

/** =============== SELECTOR DE RULES =============== **/

export async function pickRuleAndBuildQuestion(temaPeriodoId: string, studentId: string): Promise<Pregunta> {
  const supabase = createClient()

  // 1️⃣ Leer nivel actual del alumno
  const { data: sp } = await supabase
    .from('student_periodo')
    .select('nivel')
    .eq('student_id', studentId)
    .eq('tema_periodo_id', temaPeriodoId)
    .single()

  const nivel = (sp?.nivel ?? 1) as Nivel

  // 2️⃣ Buscar una rule activa para ese tema y nivel
  const { data: rules } = await supabase
    .from('rules')
    .select('dsl')
    .eq('tema_periodo_id', temaPeriodoId)
    .eq('nivel', nivel)
    .eq('enabled', true)
    .limit(20)

  if (!rules || rules.length === 0) {
    throw new Error('No hay reglas activas para este tema/nivel.')
  }

  // 3️⃣ Parsear y construir pregunta genérica
  const raw = rules[Math.floor(Math.random() * rules.length)]?.dsl as DSL
  if (!raw) throw new Error('Formato DSL inválido o vacío.')

  return buildPreguntaGeneric(raw, nivel)
}
