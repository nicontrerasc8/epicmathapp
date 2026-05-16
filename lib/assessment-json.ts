export type DynamicOption = {
  key: string
  label: string
  latex?: string
  text?: string
  value?: string
  content?: string
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
    questions?: DynamicQuestion[]
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

export function withGeneratedPractice(
  input: DynamicAssessmentContent,
  fallbackTitle = "Evaluacion",
): DynamicAssessmentContent {
  const content = normalizeAssessmentContent(input, fallbackTitle)
  const existingPracticeQuestions = content.practice?.questions

  if (existingPracticeQuestions?.length) {
    return {
      ...content,
      practice: {
        enabled: true,
        mode: "reinforcement",
        title: `Practica: ${content.title || fallbackTitle}`,
        ...content.practice,
      },
    }
  }

  return {
    ...content,
    practice: {
      enabled: true,
      mode: "reinforcement",
      title: `Practica: ${content.title || fallbackTitle}`,
      ...content.practice,
      questions: content.questions.map((question, index) => makePracticeQuestion(question, index)),
    },
  }
}

export function getPracticeAssessmentContent(
  input: unknown,
  fallbackTitle = "Practica",
): DynamicAssessmentContent {
  const content = normalizeAssessmentContent(input, fallbackTitle)
  const practiceQuestions = content.practice?.questions

  return {
    ...content,
    title: content.practice?.title || `Practica: ${content.title || fallbackTitle}`,
    questions: practiceQuestions?.length
      ? practiceQuestions
      : content.questions.map((question, index) => makePracticeQuestion(question, index)),
    practice: {
      enabled: true,
      mode: "reinforcement",
      ...content.practice,
    },
  }
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

function makePracticeQuestion(question: DynamicQuestion, index: number): DynamicQuestion {
  return {
    ...question,
    id: `${question.id || `q${index + 1}`}-practice`,
    title: question.title || `Practica ${index + 1}`,
    subtitle: question.subtitle ? mutateTextNumbers(question.subtitle, index) : question.subtitle,
    prompt: mutateTextNumbers(question.prompt, index),
    statement: question.statement?.map((line, lineIndex) => mutateTextNumbers(line, index + lineIndex + 1)),
    options: question.options?.map((option, optionIndex) => ({
      ...option,
      label: shouldMutateOptionLabel(option.label) ? mutateTextNumbers(option.label, index + optionIndex + 1) : option.label,
      latex: option.latex ? mutateTextNumbers(option.latex, index + optionIndex + 1) : option.latex,
      text: option.text ? mutateTextNumbers(option.text, index + optionIndex + 1) : option.text,
      value: option.value ? mutateTextNumbers(option.value, index + optionIndex + 1) : option.value,
      content: option.content ? mutateTextNumbers(option.content, index + optionIndex + 1) : option.content,
    })),
    explanation: question.explanation ? mutateTextNumbers(question.explanation, index + 2) : question.explanation,
  }
}

function shouldMutateOptionLabel(label: string) {
  return label.trim().length > 1
}

function mutateTextNumbers(value: string, salt: number) {
  let seen = 0

  return value.replace(/-?\d+(?:\.\d+)?/g, (match, offset, source) => {
    const previous = source[offset - 1]
    if (previous === "q" || previous === "Q") return match

    const parsed = Number(match)
    if (!Number.isFinite(parsed)) return match

    const next = nextNumber(parsed, salt + seen)
    seen += 1
    return formatLike(match, next)
  })
}

function nextNumber(value: number, salt: number) {
  if (value === 0) return salt + 1

  const direction = salt % 2 === 0 ? 1 : -1
  const magnitude = Math.max(1, Math.round(Math.abs(value) * 0.18))
  const delta = direction * (magnitude + (salt % 3))
  const next = value + delta

  if (value > 0 && next <= 0) return value + magnitude + 1
  if (value < 0 && next >= 0) return value - magnitude - 1
  return next
}

function formatLike(original: string, value: number) {
  if (original.includes(".")) {
    const decimals = original.split(".")[1]?.length ?? 1
    return value.toFixed(decimals)
  }

  return String(Math.round(value))
}
