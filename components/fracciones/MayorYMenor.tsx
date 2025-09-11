'use client'

import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import DecisionTree from 'decision-tree'

import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'

const supabase = createClient()

// ------------------ Tipos ------------------
type Nivel = 1 | 2 | 3
type Comparador = '>' | '<' | '='
type Resultado = 'sube' | 'mantiene' | 'baja'

interface Pregunta {
  a: number
  b: number
  contexto: string
}

interface TrainingRow {
  nivel: Nivel
  aciertos: number
  errores: number
  total_respuestas: number
  resultado: Resultado
}

const temaPeriodoId = '138ef06e-1933-4628-810e-03f352b1beb6'
const MIN_RESPUESTAS_PARA_EVALUAR = 5

// ---------- Overlay ----------
const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      <p className="text-white font-semibold">Procesando…</p>
    </div>
  </div>
)

// ---------- Utils ----------
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const sujetos = ['María', 'Pedro', 'Ana', 'Lucho', 'Karla', 'Diego']
const objetos = ['gomitas', 'pelotas', 'lápices', 'caramelos', 'bloques', 'estampas']

function genContexto(a: number, b: number) {
  const s = sujetos[rand(0, sujetos.length - 1)]
  const o = objetos[rand(0, objetos.length - 1)]
  return `${s} ve dos montones de ${o}: uno con ${a} y otro con ${b}. ¿Cuál es mayor?`
}

function genPairByNivel(n: Nivel): { a: number; b: number } {
  let min = 1, max = 50
  if (n === 2) { min = 50; max = 99 }
  if (n === 3) { min = 100; max = 999 }

  // 10% de casos iguales
  if (Math.random() < 0.1) {
    const x = rand(min, max)
    return { a: x, b: x }
  }

  let a = rand(min, max)
  let b = rand(min, max)
  if (a === b) b = Math.min(max, Math.max(min, a + (Math.random() < 0.5 ? -1 : 1)))
  return { a, b }
}

function generarPregunta(nivel: Nivel): Pregunta {
  const { a, b } = genPairByNivel(nivel)
  return { a, b, contexto: genContexto(a, b) }
}

function splitData<T>(data: T[], testRatio = 0.2) {
  const shuffled = [...data].sort(() => Math.random() - 0.5)
  const testSize = Math.floor(data.length * testRatio)
  return {
    train: shuffled.slice(testSize),
    test: shuffled.slice(0, testSize),
  }
}

function evaluarPrecision(data: TrainingRow[]): number | null {
  if (data.length < 10) return null
  const { train, test } = splitData(data, 0.2)
  const dt = new DecisionTree(train, "resultado", ["nivel", "aciertos", "errores", "total_respuestas"])

  let correctos = 0
  test.forEach((row: any) => {
    const pred = dt.predict(row)
    if (pred === row.resultado) correctos++
  })

  return correctos / test.length
}

async function appendTrainingExample(example: TrainingRow, setDecisionTree: (dt: any) => void) {
  console.log("[DT] ➕ Añadiendo ejemplo real:", example)

  const { data, error } = await supabase
    .from("decision_trees")
    .select("modelo")
    .eq("tema", temaPeriodoId)
    .single()

  let trainingData: TrainingRow[] = []
  let className = "resultado"
  let features: string[] = ["nivel", "aciertos", "errores", "total_respuestas"]

  if (!error && data?.modelo) {
    trainingData = (data.modelo.trainingData as TrainingRow[]) ?? []
    className = data.modelo.className ?? className
    features = data.modelo.features ?? features
  }

  trainingData.push(example)

  const modelo = { trainingData, className, features }
  const { error: upErr } = await supabase
    .from("decision_trees")
    .upsert({ tema: temaPeriodoId, modelo }, { onConflict: "tema" })
    .select()

  if (upErr) {
    console.error("[DT] ❌ Error guardando ejemplo:", upErr)
    return
  }

  try {
    const dt = new DecisionTree(trainingData, className, features)
    setDecisionTree(dt)

    const acc = evaluarPrecision(trainingData)
    if (acc !== null) {
      const porcentaje = (acc * 100).toFixed(1)
      console.log(`[DT] 📊 Precisión actual: ${porcentaje}% | Ejemplos: ${trainingData.length}`)
      console.log("[DT] Últimos 3 ejemplos:", trainingData.slice(-3))
      toast.success(`📊 Precisión: ${porcentaje}%`)
    } else {
      console.log("[DT] ℹ️ No hay suficientes ejemplos para evaluar precisión")
    }
  } catch (e) {
    console.error("[DT] Error reentrenando árbol:", e)
  }
}

// ------------------ UI ------------------
function BigNumber({ value, accent = false }: { value: number | string; accent?: boolean }) {
  return (
    <div className="px-5 py-3 rounded-xl border border-border bg-popover text-center">
      <span className={`text-6xl font-extrabold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}

const buildHints = (p: Pregunta) => [
  { title: 'Pista 1', text: 'Mira cuántas cifras tiene cada número: el que tiene más cifras es mayor.' },
  { title: 'Pista 2', text: 'Si tienen las mismas cifras, compara de izquierda a derecha.' },
  { title: 'Pista 3', text: 'Si todos los dígitos son iguales, entonces los números son iguales (=).' },
]

// ---------- Componente principal ----------
export default function CompararNumerosPrimeroGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [respuestasEnNivel, setRespuestasEnNivel] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [decisionTree, setDecisionTree] = useState<any>(null)

  const [guidedMode, setGuidedMode] = useState(true)
  const [hintIndex, setHintIndex] = useState(0)
  const [showGuidePanel, setShowGuidePanel] = useState(true)

  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const { student } = useStudent()
  const firstButtonRef = useRef<HTMLButtonElement>(null)

  const withLock = async (fn: () => Promise<void>) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try { await fn() } finally { setIsSubmitting(false) }
  }

  const nextWithDelay = (ms: number, nuevoNivel: Nivel) => {
    setIsSubmitting(true)
    setTimeout(() => {
      reiniciarEjercicio(nuevoNivel)
      setIsSubmitting(false)
    }, ms)
  }

  async function cargarModelo() {
    const { data, error } = await supabase
      .from('decision_trees')
      .select('modelo')
      .eq('tema', temaPeriodoId)
      .single()

    if (error) {
      console.error('Error cargando modelo:', error)
      return
    }

    if (data?.modelo) {
      const { trainingData, className, features } = data.modelo
      const dt = new DecisionTree(trainingData, className, features)
      setDecisionTree(dt)

      const acc = evaluarPrecision(trainingData)
      if (acc !== null) {
        console.log(`[DT] 🔍 Precisión inicial: ${(acc * 100).toFixed(1)}% | Ejemplos: ${trainingData.length}`)
      }
    }
  }

  useEffect(() => {
    const cargar = async () => {
      if (student?.id) {
        const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
        const nivelInicial = (nivelBD ?? 1) as Nivel
        setNivelActual(nivelInicial)
        const q = generarPregunta(nivelInicial)
        setPregunta(q)
        setHintIndex(0)
        start()
        await cargarModelo()
      }
    }
    cargar()
  }, [student])

  useEffect(() => {
    firstButtonRef.current?.focus()
  }, [pregunta])

  if (!pregunta) return null

  // -------- registrar respuesta --------
  const registrarRespuesta = async (es_correcto: boolean, respuestaOp: Comparador) => {
    if (!student?.id || !pregunta) return
    const map = { '>': 1, '=': 0, '<': -1 } as const
    await insertStudentResponse({
      student_id: student.id,
      tema_periodo_id: temaPeriodoId,
      nivel: nivelActual,
      es_correcto,
      ejercicio_data: { a: pregunta.a, b: pregunta.b, operador: 'comparar', contexto: pregunta.contexto },
      respuesta: { numerador: map[respuestaOp], denominador: 1 },
      tiempo_segundos: elapsedSeconds,
    })
  }

  const reiniciarEjercicio = (nuevoNivel: Nivel) => {
    const q = generarPregunta(nuevoNivel)
    setPregunta(q)
    setFallosEjercicioActual(0)
    setHintIndex(0)
    reset()
    start()
  }

  // -------- manejar errores --------
  const manejarError = async (respuestaOp: Comparador) => {
    await registrarRespuesta(false, respuestaOp)
    const nuevosErrores = errores + 1
    const nuevasRespuestas = respuestasEnNivel + 1
    
    setErrores(nuevosErrores)
    setAciertos(0)
    setRespuestasEnNivel(nuevasRespuestas)

    let nuevoNivel = nivelActual
    let decision: Resultado = "mantiene"

    if (nuevasRespuestas >= MIN_RESPUESTAS_PARA_EVALUAR) {
      const totalRespuestas = nuevosErrores + aciertos
      const porcentajeAciertos = aciertos / totalRespuestas

      if (decisionTree) {
        decision = decisionTree.predict({
          nivel: nivelActual,
          aciertos: aciertos,
          errores: nuevosErrores,
          total_respuestas: totalRespuestas,
        }) as Resultado

        console.log(`[DT] 🔮 Predicción error: ${decision} | Nivel ${nivelActual} | Aciertos=${aciertos} | Errores=${nuevosErrores} | Total=${totalRespuestas}`)

        if (decision === 'baja' && nivelActual > 1 && porcentajeAciertos < 0.3) {
          nuevoNivel = (nivelActual - 1) as Nivel
          await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
          toast('Bajaste de nivel 📉', { icon: '📉' })
          setNivelActual(nuevoNivel)
          setAciertos(0)
          setErrores(0)
          setRespuestasEnNivel(0)
        }
      }
    }

    const nuevoRow: TrainingRow = {
      nivel: nivelActual,
      aciertos,
      errores: nuevosErrores,
      total_respuestas: nuevasRespuestas,
      resultado: decision,
    }
    await appendTrainingExample(nuevoRow, setDecisionTree)

    nextWithDelay(1000, nuevoNivel)
  }

  // -------- verificar --------
  const verificar = async (opElegido: Comparador) => {
    if (!pregunta) return
    const correcto: Comparador =
      pregunta.a > pregunta.b ? '>' : pregunta.a < pregunta.b ? '<' : '='

    if (opElegido === correcto) {
      await registrarRespuesta(true, opElegido)
      const nuevosAciertos = aciertos + 1
      const nuevasRespuestas = respuestasEnNivel + 1

      setAciertos(nuevosAciertos)
      setErrores(0)
      setRespuestasEnNivel(nuevasRespuestas)
      toast.success('🎉 ¡Correcto!')
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })

      let nuevoNivel = nivelActual
      let decision: Resultado = "mantiene"

      if (nuevasRespuestas >= MIN_RESPUESTAS_PARA_EVALUAR) {
        const totalRespuestas = nuevosAciertos + errores
        const porcentajeAciertos = nuevosAciertos / totalRespuestas

        if (decisionTree) {
          decision = decisionTree.predict({
            nivel: nivelActual,
            aciertos: nuevosAciertos,
            errores: errores,
            total_respuestas: totalRespuestas,
          }) as Resultado

          console.log(`[DT] 🔮 Predicción acierto: ${decision} | Nivel ${nivelActual} | Aciertos=${nuevosAciertos} | Errores=${errores} | Total=${totalRespuestas}`)

          if (decision === 'sube' && nivelActual < 3 && porcentajeAciertos >= 0.8) {
            nuevoNivel = (nivelActual + 1) as Nivel
            await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
            toast('¡Subiste de nivel! 🚀', { icon: '🚀' })
            setNivelActual(nuevoNivel)
            setAciertos(0)
            setErrores(0)
            setRespuestasEnNivel(0)
            nextWithDelay(900, nuevoNivel)
          }
        }
      }

      const nuevoRow: TrainingRow = {
        nivel: nivelActual,
        aciertos: nuevosAciertos,
        errores,
        total_respuestas: nuevasRespuestas,
        resultado: decision,
      }
      await appendTrainingExample(nuevoRow, setDecisionTree)

      nextWithDelay(900, nuevoNivel)
    } else {
      toast.error('Casi… Primero mira la cantidad de cifras.')
      if (guidedMode) setHintIndex((i) => Math.min(i + 1, 2))
      await manejarError(opElegido)
    }
  }

  const hints = buildHints(pregunta)
  const coachMsg =
    fallosEjercicioActual === 0
      ? 'Mira cuántas cifras tiene cada número. Si empatan, compara dígito por dígito.'
      : fallosEjercicioActual === 1
      ? 'Piensa: ¿quién tiene más “tamañito”? Luego compara los dígitos.'
      : 'Usa una pista y vuelve a intentar con calma.'

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <div className="mx-auto bg-card flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
        {/* Barra superior */}
        <div className="w-full flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            ✅ Aciertos: <b>{aciertos}</b> &nbsp;|&nbsp; ❌ Errores: <b>{errores}</b>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold">
              Nivel {nivelActual}
            </span>
            <button
              onClick={() => setShowGuidePanel((v) => !v)}
              className="px-3 py-1 rounded-md border border-border text-sm hover:bg-input"
            >
              {showGuidePanel ? 'Ocultar guía' : 'Mostrar guía'}
            </button>
          </div>
        </div>

        {/* Guía y pistas */}
        <AnimatePresence initial={false}>
          {guidedMode && showGuidePanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden"
            >
              <div className="rounded-lg border border-border p-4 bg-background">
                <h3 className="font-semibold mb-2 text-foreground">Cómo comparamos</h3>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground">
                  <li>Primero mira <b>la cantidad de cifras</b>.</li>
                  <li>Si empatan, compara de <b>izquierda a derecha</b>.</li>
                  <li>Si todos los dígitos son iguales, usa <b>=</b>.</li>
                </ol>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setHintIndex((i) => Math.min(i + 1, hints.length - 1))}
                    className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground font-medium hover:opacity-90"
                  >
                    Pedir pista
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {hints[hintIndex] && (
                    <motion.div
                      key={hintIndex}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-3 rounded-md border border-dashed border-ring/40 p-3 text-sm bg-white"
                    >
                      <div className="font-medium">{hints[hintIndex].title}</div>
                      <div className="text-foreground/80">{hints[hintIndex].text}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mensaje del “profe” */}
        <div className="w-full rounded-md border border-border p-3 bg-white text-sm">
          <span className="font-medium">Profe:</span> {coachMsg}
        </div>

        {/* Contexto */}
        <p className="text-lg text-center text-foreground">{pregunta.contexto}</p>

        {/* Números y botones */}
        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-muted-foreground">Primer número</span>
            <BigNumber value={pregunta.a} accent />
          </div>

          <div className="flex flex-col items-center justify-center gap-3">
            <button
              ref={firstButtonRef}
              onClick={() => withLock(() => verificar('>'))}
              className="w-20 py-3 rounded-xl bg-accent text-accent-foreground text-3xl font-extrabold border border-border hover:brightness-110"
            >
              &gt;
            </button>
            <button
              onClick={() => withLock(() => verificar('<'))}
              className="w-20 py-3 rounded-xl bg-accent text-accent-foreground text-3xl font-extrabold border border-border hover:brightness-110"
            >
              &lt;
            </button>
            <button
              onClick={() => withLock(() => verificar('='))}
              className="w-20 py-3 rounded-xl bg-accent text-accent-foreground text-3xl font-extrabold border border-border hover:brightness-110"
            >
              =
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-muted-foreground">Segundo número</span>
            <BigNumber value={pregunta.b} accent />
          </div>
        </div>
      </div>
    </>
  )
}
