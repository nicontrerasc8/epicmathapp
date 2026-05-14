export type DynamicOption = {
  key: string
  label: string
  latex?: string
}

export type DynamicQuestion = {
  id: string
  title: string
  subtitle?: string
  prompt: string
  statement?: string[]
  visual?: string
  imageUrl?: string
  images?: Array<{ src: string; alt?: string }>
  options?: DynamicOption[]
  correctKey?: string
  explanation?: string
}

export type DynamicAssessmentContent = {
  title?: string
  subtitle?: string
  institution?: string
  questions: DynamicQuestion[]
  practice?: {
    enabled?: boolean
    mode?: string
    title?: string
  }
}

export type DynamicAssessmentSettings = {
  mode?: string
  attemptsAllowed?: number
  practiceAttemptsAllowed?: number
  showScore?: boolean
  showReview?: boolean
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  practiceEnabled?: boolean
}

export function normalizeAssessmentContent(input: unknown, fallbackTitle = "Evaluacion"): DynamicAssessmentContent {
  if (Array.isArray(input)) {
    return {
      title: fallbackTitle,
      questions: input,
    } satisfies DynamicAssessmentContent
  }

  if (input && typeof input === "object") {
    const value = input as Partial<DynamicAssessmentContent>
    return {
      ...value,
      title: value.title || fallbackTitle,
      questions: Array.isArray(value.questions) ? value.questions : [],
    } satisfies DynamicAssessmentContent
  }

  return {
    title: fallbackTitle,
    questions: [],
  } satisfies DynamicAssessmentContent
}

export function parseAssessmentText(input: string, fallbackTitle = "Evaluacion") {
  const trimmed = input.trim()
  if (!trimmed) return null

  const direct = tryJson(trimmed)
  if (direct.ok) return normalizeAssessmentContent(direct.value, fallbackTitle)

  const jsonish = toJsonish(trimmed)
  const jsonishValue = tryJson(jsonish)
  if (jsonishValue.ok) return normalizeAssessmentContent(jsonishValue.value, fallbackTitle)

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    const arrayValue = tryJson(arrayMatch[0])
    if (arrayValue.ok) return normalizeAssessmentContent(arrayValue.value, fallbackTitle)

    const arrayJsonish = toJsonish(arrayMatch[0])
    const parsedArrayJsonish = tryJson(arrayJsonish)
    if (parsedArrayJsonish.ok) return normalizeAssessmentContent(parsedArrayJsonish.value, fallbackTitle)
  }

  throw new Error("El contenido no es valido. Usa JSON, un objeto con questions, o pega un export const con arreglo de preguntas.")
}

export function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function tryJson(input: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(input) }
  } catch {
    return { ok: false }
  }
}

function toJsonish(input: string) {
  let value = input
    .replace(/export\s+type\s+[\s\S]*?(?=export\s+const|$)/g, "")
    .replace(/export\s+const\s+[A-Za-z0-9_]+\s*(?::\s*[^=]+)?=\s*/g, "")
    .replace(/\s+as\s+const\s*;?\s*$/g, "")
    .trim()

  if (value.endsWith(";")) value = value.slice(0, -1)

  return value
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, "$1")
}
