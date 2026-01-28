"use client"

import { useMemo, useState } from "react"
import {
  Timer,
  ShieldCheck,
  Calculator,
  ArrowUpDown,
  BarChart3,
  Hash,
} from "lucide-react"

import { ExerciseShell } from "../base/ExerciseShell"
import { SolutionBox } from "../base/SolutionBox"
import { DetailedExplanation } from "../base/DetailedExplanation"
import { MathProvider, MathTex } from "../base/MathBlock"
import { ExerciseHud } from "../base/ExerciseHud"
import { OptionsGrid, type Option } from "../base/OptionsGrid"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

/* ============================================================
   Media, mediana y moda (autocalifica al elegir opción)
   - 1 solo intento
   - Generación 100% algorítmica (sin hardcode)
   - Explicación paso a paso + tablas (orden/frecuencias)
   - Gamification: trofeos + streak + timer + HUD
============================================================ */

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function coin(p = 0.5) {
  return Math.random() < p
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}
function sortAsc(nums: number[]) {
  return [...nums].sort((a, b) => a - b)
}
function sum(nums: number[]) {
  return nums.reduce((acc, v) => acc + v, 0)
}
function fmt(n: number) {
  // si fuera decimal, usamos 1 decimal (pero el generador busca enteros para la respuesta)
  const isInt = Math.abs(n - Math.round(n)) < 1e-9
  return isInt ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "")
}

type AskType = "mean" | "median" | "mode"

function labelAsk(t: AskType) {
  if (t === "mean") return "media"
  if (t === "median") return "mediana"
  return "moda"
}
function askIcon(t: AskType) {
  if (t === "mean") return Calculator
  if (t === "median") return ArrowUpDown
  return BarChart3
}

/* =========================
   ESTADÍSTICA BÁSICA
========================= */
function meanValue(nums: number[]) {
  return sum(nums) / nums.length
}
function medianValue(nums: number[]) {
  const s = sortAsc(nums)
  const n = s.length
  if (n % 2 === 1) return s[(n - 1) / 2]
  const a = s[n / 2 - 1]
  const b = s[n / 2]
  return (a + b) / 2
}
function modeValue(nums: number[]) {
  const freq = new Map<number, number>()
  for (const v of nums) freq.set(v, (freq.get(v) ?? 0) + 1)

  const entries = Array.from(freq.entries())

  let bestVal: number | null = null
  let bestCount = 0
  for (const [v, c] of entries) {
    if (c > bestCount) {
      bestCount = c
      bestVal = v
    }
  }

  // "no hay moda" si todo ocurre 1 vez
  if (bestCount <= 1 || bestVal == null) return null

  // si hay empate en la mayor frecuencia, consideramos "multimodal"
  const ties = Array.from(freq.entries()).filter(([, c]) => c === bestCount)
  if (ties.length > 1) return { multimodal: true as const, values: ties.map(([v]) => v), bestCount }

  return { multimodal: false as const, value: bestVal, bestCount }
}

function frequencyRows(nums: number[]) {
  const freq = new Map<number, number>()
  for (const v of nums) freq.set(v, (freq.get(v) ?? 0) + 1)
  return Array.from(freq.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ value, count }))
}

/* =========================
   GENERADOR DE DATA "BUENA"
========================= */
function generateDatasetWithUniqueMode(n: number, min = 2, max = 20) {
  // Garantiza una moda única (un valor con mayor frecuencia que los demás)
  const modeVal = randInt(min, max)
  const modeCount = clamp(coin(0.55) ? 3 : 2, 2, Math.max(2, n - 2))
  const maxOther = modeCount - 1

  const freq = new Map<number, number>()
  const out: number[] = []

  // coloca la moda
  for (let i = 0; i < modeCount; i++) {
    out.push(modeVal)
    freq.set(modeVal, (freq.get(modeVal) ?? 0) + 1)
  }

  while (out.length < n) {
    const v = randInt(min, max)
    if (v === modeVal) continue
    const c = freq.get(v) ?? 0
    if (c >= maxOther) continue
    out.push(v)
    freq.set(v, c + 1)
  }

  // desordena para que el paso de ordenar tenga sentido
  out.sort(() => Math.random() - 0.5)
  return out
}

function isQualityScenario(nums: number[], ask: AskType) {
  const n = nums.length
  if (n < 7 || n > 12) return false

  // respuestas "limpias" (enteros) para evitar ambigüedad
  const mean = meanValue(nums)
  if (Math.abs(mean - Math.round(mean)) > 1e-9) return false

  const med = medianValue(nums)
  if (Math.abs(med - Math.round(med)) > 1e-9) return false

  const mode = modeValue(nums)
  if (mode == null) return false
  if (mode.multimodal) return false

  // evita que sea demasiado trivial: que no sean todos iguales
  const uniq = new Set(nums)
  if (uniq.size <= 3) return false

  // evita respuestas demasiado repetidas (media=mediana=moda) casi siempre
  const a = Math.round(mean)
  const b = Math.round(med)
  const c = mode.value
  const sameAll = a === b && b === c
  if (sameAll && coin(0.85)) return false

  // para "moda", aseguramos que la moda ocurra al menos 2 veces (ya garantizado)
  if (ask === "mode") {
    const freq = frequencyRows(nums)
    const maxCount = Math.max(...freq.map(r => r.count))
    if (maxCount < 2) return false
  }

  return true
}

function generateScenario() {
  const ask: AskType = choice(["mean", "median", "mode"])
  for (let tries = 0; tries < 220; tries++) {
    const n = randInt(7, 12)
    const nums = generateDatasetWithUniqueMode(n, 2, 20)
    if (!isQualityScenario(nums, ask)) continue

    const sorted = sortAsc(nums)
    const mean = Math.round(meanValue(nums))
    const median = Math.round(medianValue(nums))
    const mode = modeValue(nums) as { multimodal: false; value: number; bestCount: number }

    const correct =
      ask === "mean" ? fmt(mean) : ask === "median" ? fmt(median) : fmt(mode.value)

    return {
      ask,
      nums,
      sorted,
      mean,
      median,
      mode: mode.value,
      modeCount: mode.bestCount,
      correct,
    }
  }

  // fallback seguro
  const fallbackAsk: AskType = "median"
  const nums = [6, 10, 6, 12, 8, 7, 9, 6, 11]
  const sorted = sortAsc(nums)
  const modeResult = modeValue(nums) as { multimodal: false; value: number; bestCount: number }
  
  return {
    ask: fallbackAsk,
    nums,
    sorted,
    mean: Math.round(meanValue(nums)),
    median: Math.round(medianValue(nums)),
    mode: modeResult.value,
    modeCount: modeResult.bestCount,
    correct: fmt(Math.round(medianValue(nums))),
  }
}

/* =========================
   DISTRACTORES "SERIOS"
========================= */
function uniquePush(set: Set<string>, v: any) {
  if (!set.has(v)) set.add(v)
}

function generateOptions(s: ReturnType<typeof generateScenario>): Option[] {
  const { ask, nums, sorted, mean, median, mode, correct } = s
  const set:any = new Set<any>()

  // 1) distractores basados en errores típicos
  if (ask === "mean") {
    // error: dividir por n-1 (o n+1)
    const n = nums.length
    uniquePush(set, fmt(sum(nums) / Math.max(1, n - 1)))
    uniquePush(set, fmt(sum(nums) / (n + 1)))
    // error: sumar mal (±1..±3)
    uniquePush(set, fmt((sum(nums) + randInt(1, 3)) / n))
    uniquePush(set, fmt((sum(nums) - randInt(1, 3)) / n))
  } else if (ask === "median") {
    const n = sorted.length
    if (n % 2 === 1) {
      const mid = (n - 1) / 2
      uniquePush(set, fmt(sorted[clamp(mid - 1, 0, n - 1)]))
      uniquePush(set, fmt(sorted[clamp(mid + 1, 0, n - 1)]))
      // error: "mediana" sin ordenar (tomar el del centro del listado original)
      uniquePush(set, fmt(nums[Math.floor(n / 2)]))
    } else {
      const a = sorted[n / 2 - 1]
      const b = sorted[n / 2]
      uniquePush(set, fmt(a))
      uniquePush(set, fmt(b))
      uniquePush(set, fmt((a + b) / 2 + 1))
      uniquePush(set, fmt((a + b) / 2 - 1))
    }
  } else {
    // mode
    uniquePush(set, fmt(median))
    uniquePush(set, fmt(mean))
    // "segundo más frecuente" o cercano a la moda
    const freqs = frequencyRows(nums).sort((a, b) => b.count - a.count)
    const second = freqs.find(r => r.value !== mode)
    if (second) uniquePush(set, fmt(second.value))
    uniquePush(set, fmt(mode + (coin() ? 1 : -1)))
  }

  // limpia: no queremos la correcta en el set de distractores
  set.delete(correct)

  // si sobran, recortamos; si faltan, rellenamos cerca
  const distractors: string[] = []
  for (const v of set) {
    if (distractors.length >= 10) break
    distractors.push(v)
  }

  while (distractors.length < 3) {
    const base = Number(correct)
    const cand = fmt(base + randInt(-3, 3))
    if (cand !== correct && !distractors.includes(cand)) distractors.push(cand)
  }

  const options: Option[] = [
    { value: correct, correct: true },
    ...distractors.slice(0, 3).map(v => ({ value: v, correct: false })),
  ].sort(() => Math.random() - 0.5)

  return options
}

/* =========================
   TEX (para la explicación)
========================= */
function listTeX(nums: number[]) {
  // \{2, 5, 5, 7\}
  return `\\{${nums.join(", ")}\\}`
}
function meanTeX(S: number, n: number) {
  return `\\bar{x} = \\frac{\\sum x_i}{n} = \\frac{${S}}{${n}}`
}
function medianOddTeX(n: number) {
  return `\\text{Posición de la mediana} = \\frac{n+1}{2} = \\frac{${n}+1}{2}`
}
function medianEvenTeX(n: number) {
  return `\\text{Mediana} = \\frac{x_{\\frac{n}{2}} + x_{\\frac{n}{2}+1}}{2}`
}

/* ============================================================
   COMPONENTE
============================================================ */
export default function MediaMedianaModaGame({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const { studentId, gami, gamiLoading, submitAttempt } = useExerciseSubmission({
    exerciseId,
    classroomId,
    sessionId,
  })

  // ejercicio
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  // timer
  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const scenario = useMemo(() => {
    const s = generateScenario()
    const options = generateOptions(s)

    return {
      ...s,
      options,
      sum: sum(s.nums),
      n: s.nums.length,
      freqRows: frequencyRows(s.nums),
    }
  }, [nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000
    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: scenario.correct,
        question: {
          ask: scenario.ask,
          askLabel: labelAsk(scenario.ask),
          nums: scenario.nums,
        },
        computed: {
          sum: scenario.sum,
          n: scenario.n,
          sorted: scenario.sorted,
          mean: scenario.mean,
          median: scenario.median,
          mode: scenario.mode,
          modeCount: scenario.modeCount,
        },
        options: scenario.options.map(o => o.value),
        extra: {
          time_seconds: Math.floor(timeSeconds),
          trophy_preview: computeTrophyGain(timeSeconds),
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const AskIcon = askIcon(scenario.ask)

  return (
    <MathProvider>
      <ExerciseShell
        title="Medidas de tendencia central"
        prompt={`Elige la alternativa correcta: la ${labelAsk(scenario.ask)} del conjunto es...`}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Guía paso a paso"
              steps={[
                {
                  title: 'Qué nos piden',
                  detail: `Esta pregunta solicita la ${labelAsk(scenario.ask)} del conjunto de ${scenario.n} datos.`,
                  content: (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AskIcon className="h-4 w-4" />
                        <span>
                          {scenario.ask === 'mean' && 'Media = promedio de todos los valores.'}
                          {scenario.ask === 'median' && 'Mediana = valor central tras ordenar los datos.'}
                          {scenario.ask === 'mode' && 'Moda = valor que aparece con mayor frecuencia.'}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Aprovecha que el generador ya entregó el conjunto completo y sus frecuencias.
                      </p>
                    </div>
                  ),
                },
                {
                  title: 'Datos y frecuencias',
                  detail:
                    'Compara el conjunto original y su ordenado para visualizar qué números aparecen y con qué frecuencia.',
                  content: (
                    <>
                      <div className="text-xs text-muted-foreground mb-1">Datos originales</div>
                      <MathTex block tex={listTeX(scenario.nums)} />
                      <div className="text-xs text-muted-foreground mt-3 mb-1">Datos ordenados</div>
                      <MathTex block tex={listTeX(scenario.sorted)} />
                    </>
                  ),
                },
                {
                  title: `Cálculo de la ${labelAsk(scenario.ask)}`,
                  detail:
                    scenario.ask === 'mean'
                      ? `Suma todos los valores (${scenario.sum}) y divide por ${scenario.n}.`
                      : scenario.ask === 'median'
                      ? scenario.n % 2 === 1
                        ? 'Selecciona el valor central.'
                        : 'Promedia los dos valores centrales.'
                      : 'Cuenta la frecuencia de cada número y toma el más repetido.',
                  content:
                    scenario.ask === 'mean' ? (
                      <MathTex block tex={meanTeX(scenario.sum, scenario.n)} />
                    ) : scenario.ask === 'median' ? (
                      scenario.n % 2 === 1 ? (
                        <MathTex block tex={medianOddTeX(scenario.n)} />
                      ) : (
                        <MathTex block tex={medianEvenTeX(scenario.n)} />
                      )
                    ) : (
                      <table className="border w-full text-center text-xs">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border py-2">Valor</th>
                            <th className="border py-2">Frecuencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scenario.freqRows.map(r => (
                            <tr key={r.value} className={r.value === scenario.mode ? 'bg-amber-100' : ''}>
                              <td className="border py-2 font-semibold">{r.value}</td>
                              <td className="border py-2">{r.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ),
                },
                {
                  title: 'Verificación rápida',
                  detail:
                    'Revisa que el resultado considere todos los datos y encaje con la definición (promedio, centro o moda).',
                  content: (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-muted-foreground">
                        Confirmaste que {labelAsk(scenario.ask)} = {scenario.correct}
                      </span>
                    </div>
                  ),
                },
              ]}
              concluding={`Respuesta final: ${scenario.correct}. Este valor coincide con la ${labelAsk(scenario.ask)} pedida.`}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Datos</div>
          <div className="mt-2 rounded-lg border bg-background p-3">
            <MathTex block tex={listTeX(scenario.nums)} />
          </div>

          <div className="mt-3 text-sm">
            <span className="text-muted-foreground">Pregunta:</span>{" "}
            <span className="font-semibold">
              ¿Cuál es la {labelAsk(scenario.ask)}?
            </span>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
        />

        <div className="mt-6">
          <ExerciseHud
            elapsed={elapsed}
            trophyPreview={trophyPreview}
            gami={gami}
            gamiLoading={gamiLoading}
            studentId={studentId}
            wrongPenalty={WRONG_PENALTY}
            status={engine.status}
          />
        </div>
      </ExerciseShell>
    </MathProvider>
  )
}
