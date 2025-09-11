'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import DecisionTree from 'decision-tree'

import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import FractionCanvas from './FractionCanvas'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'

const supabase = createClient()
const temaPeriodoId = '4f098735-8cea-416a-be52-12e91adbba23'

// ====== Tipos/constantes para el modelo ======
type Nivel = 1 | 2 | 3
type Tiempo = 'rapido' | 'moderado' | 'lento'
type Mejora = 'mejora' | 'estable' | 'empeora'
type Resultado = 'sube' | 'mantiene' | 'baja'

type Sample = {
  nivel: Nivel
  aciertos: number
  errores: number
  tiempo_promedio: Tiempo
  pistas_usadas: number
  racha: number
  mejora: Mejora
  tipo_problema: 'fracciones'
}

type TrainingRow = Sample & { resultado: Resultado }

const CLASS_NAME = 'resultado'
const FEATURES = [
  'nivel',
  'aciertos',
  'errores',
  'tiempo_promedio',
  'pistas_usadas',
  'racha',
  'mejora',
  'tipo_problema',
] as const

interface Pregunta {
  a: number
  b: number
  operador: string
  denominador1: number
  denominador2: number
  contexto: string
}

// ---------- Loading Overlay ----------
const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      <p className="text-white font-semibold">Procesando…</p>
    </div>
  </div>
)

// ---------- Helpers adaptativos ----------
const getTiempoCategoria = (segundos: number): Tiempo => {
  if (segundos <= 20) return 'rapido'
  if (segundos <= 40) return 'moderado'
  return 'lento'
}

const getTendencia = (hist: boolean[]): Mejora => {
  if (hist.length < 3) return 'estable'
  const ult = hist.slice(-3)
  const aciertos = ult.filter(Boolean).length
  if (aciertos === 3) return 'mejora'
  if (aciertos === 0) return 'empeora'
  return 'estable'
}

// ---------- Árbol de decisión ----------
async function cargarModelo(setDecisionTree: (dt: any) => void) {
  const { data, error } = await supabase
    .from('decision_trees')
    .select('modelo')
    .eq('tema', temaPeriodoId)
    .single()

  if (error) {
    console.error('[DT] Error cargando modelo:', error)
    return
  }

  if (data?.modelo) {
    const { trainingData, className, features } = data.modelo
    const dt = new DecisionTree(trainingData, className ?? CLASS_NAME, features ?? FEATURES)
    console.log('[DT] Modelo cargado. Ejemplos=', trainingData?.length ?? 0)
    setDecisionTree(dt)
  } else {
    // Si no existe, crea una base vacía
    const empty = { trainingData: [] as TrainingRow[], className: CLASS_NAME, features: FEATURES }
    await supabase.from('decision_trees').upsert({ tema: temaPeriodoId, modelo: empty }, { onConflict: 'tema' })
    console.warn('[DT] No había modelo, se creó vacío.')
  }
}

// ---------- Generación de pregunta ----------
const generarPregunta = (nivel: Nivel): Pregunta => {
  let rango: number[] = []
  if (nivel === 1) rango = Array.from({ length: 8 }, (_, i) => i + 2) // 2-9
  if (nivel === 2) rango = Array.from({ length: 40 }, (_, i) => i + 10) // 10-49
  if (nivel === 3) rango = Array.from({ length: 50 }, (_, i) => i + 50) // 50-99

  const denominador1 = rango[Math.floor(Math.random() * rango.length)]
  let denominador2: number
  do {
    denominador2 = rango[Math.floor(Math.random() * rango.length)]
  } while (denominador2 === denominador1)

  const a = Math.floor(Math.random() * denominador1) + 1
  const b = Math.floor(Math.random() * denominador2) + 1

  const contextos = [
    `María tiene ${a}/${denominador1} de una torta y come ${b}/${denominador2} de esa porción. ¿Qué fracción del total comió?`,
    `Pedro pinta ${a}/${denominador1} de una pared y su amigo pinta ${b}/${denominador2} de lo que pintó Pedro. ¿Qué fracción de la pared pintó el amigo?`,
    `Ana bebe ${a}/${denominador1} de un jugo y su hermano bebe ${b}/${denominador2} de lo que bebió Ana. ¿Qué fracción del jugo bebió el hermano?`,
    `Carlos tiene ${a}/${denominador1} de una colección y vende ${b}/${denominador2} de su parte. ¿Qué fracción de la colección vendió?`,
  ]

  return { a, b, operador: '×', denominador1, denominador2, contexto: contextos[Math.floor(Math.random() * contextos.length)] }
}

// ---------- UI: fracción bonita ----------
function FractionPretty({
  numerador,
  denominador,
  size = 'text-4xl',
  accent = false,
}: {
  numerador: number | string
  denominador: number | string
  size?: string
  accent?: boolean
}) {
  return (
    <div className={`inline-flex flex-col items-center justify-center leading-none`}>
      <span className={`${size} font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{numerador}</span>
      <span className="w-full h-0.5 my-1 bg-border" />
      <span className={`${size} font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{denominador}</span>
    </div>
  )
}

// ---------- Pistas ----------
const buildHints = (p: Pregunta) => ([
  { title: 'Pista 1 — ¿Cómo multiplico fracciones?', text: 'Multiplica numeradores entre sí y denominadores entre sí. ¡No simplifiques en este juego!' },
  { title: 'Pista 2 — Numeradores', text: `Multiplica ${p.a} × ${p.b}. Ese será el numerador.` },
  { title: 'Pista 3 — Denominadores', text: `Multiplica ${p.denominador1} × ${p.denominador2}. Ese será el denominador.` },
])

// ===== Helpers de evaluación de precisión =====
function splitData<T>(data: T[], testRatio = 0.2) {
  const shuffled = [...data].sort(() => Math.random() - 0.5)
  const testSize = Math.floor(data.length * testRatio)
  return {
    train: shuffled.slice(testSize),
    test: shuffled.slice(0, testSize),
  }
}

function evaluarPrecision(data: TrainingRow[]) {
  if (!data || data.length < 10) return null
  const { train, test } = splitData(data, 0.2)
  const dt = new DecisionTree(train, CLASS_NAME, FEATURES as unknown as string[])
  let correctos = 0
  for (const row of test) {
    const pred = dt.predict(row)
    if (pred === row.resultado) correctos++
  }
  return correctos / test.length
}

// ===== Upsert + reentrenar + logs de precisión =====
async function appendTrainingExample(
  example: TrainingRow,
  setDecisionTree: (dt: any) => void
) {
  console.log('[DT] ➕ Añadiendo ejemplo real:', example)

  const { data, error } = await supabase
    .from('decision_trees')
    .select('modelo')
    .eq('tema', temaPeriodoId)
    .single()

  let trainingData: TrainingRow[] = []
  let className = CLASS_NAME
  let features: string[] = FEATURES as unknown as string[]

  if (!error && data?.modelo) {
    trainingData = (data.modelo.trainingData as TrainingRow[]) ?? []
    className = data.modelo.className ?? className
    features = data.modelo.features ?? features
  }

  trainingData.push(example)

  const modelo = { trainingData, className, features }
  const { error: upErr } = await supabase
    .from('decision_trees')
    .upsert({ tema: temaPeriodoId, modelo }, { onConflict: 'tema' })
    .select()

  if (upErr) {
    console.error('[DT] ❌ Error guardando ejemplo en Supabase:', upErr)
    return
  }

  try {
    const dt = new DecisionTree(trainingData, className, features)
    setDecisionTree(dt)
    const acc = evaluarPrecision(trainingData)
    if (acc !== null) {
      const pct = (acc * 100).toFixed(1)
      console.log(`[DT] 📊 Precisión actual: ${pct}%  | Ejemplos: ${trainingData.length}`)
      toast.success(`📊 Precisión del modelo: ${pct}%`)
    } else {
      console.log('[DT] (Precisión) Aún no hay suficientes ejemplos.')
    }
  } catch (e) {
    console.error('[DT] Error reentrenando árbol en memoria:', e)
  }
}

export function FraccionesMultiplicacionStGeorgeGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [decisionTree, setDecisionTree] = useState<any>(null)

  const [respuestaFinal, setRespuestaFinal] = useState({ numerador: '', denominador: '' })
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)

  // Métricas extra para el árbol
  const [racha, setRacha] = useState(0)
  const [pistasUsadas, setPistasUsadas] = useState(0)
  const [historial, setHistorial] = useState<boolean[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const [guidedMode, setGuidedMode] = useState(true)
  const [hintIndex, setHintIndex] = useState(0)
  const [showGuidePanel, setShowGuidePanel] = useState(true)

  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const finalNumeradorRef = useRef<HTMLInputElement>(null)
  const finalDenominadorRef = useRef<HTMLInputElement>(null)
  const { student } = useStudent()
  const initRef = useRef(false)

  useEffect(() => {
    if (!student?.id) return
    if (initRef.current) return
    initRef.current = true

    ;(async () => {
      const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
      const nivelInicial = (nivelBD ?? 1) as Nivel
      setNivelActual(nivelInicial)
      setPregunta(generarPregunta(nivelInicial))
      setHintIndex(0)
      start()
      await cargarModelo(setDecisionTree)
    })()
  }, [student])

  if (!pregunta) return null

  // -------- Registro de intento (sin cambiar tipos)
  const registrarRespuesta = async (es_correcto: boolean) => {
    if (!student?.id || !temaPeriodoId || !pregunta) return
    const tiempoCat: Tiempo = getTiempoCategoria(elapsedSeconds)
    const nuevaRacha = es_correcto ? racha + 1 : 0
    const tendencia: Mejora = getTendencia([...historial, es_correcto])

    await insertStudentResponse({
      student_id: student.id,
      tema_periodo_id: temaPeriodoId,
      nivel: nivelActual,
      es_correcto,
      ejercicio_data: {
        a: pregunta.a, b: pregunta.b, operador: pregunta.operador,
        denominador1: pregunta.denominador1, denominador2: pregunta.denominador2,
        contexto: pregunta.contexto,
      },
      // Guardamos features dentro de "respuesta" para no tocar tipos
      respuesta: {
        numerador: parseInt(respuestaFinal.numerador),
        denominador: parseInt(respuestaFinal.denominador),
        tiempo_promedio: tiempoCat,
        pistas_usadas: pistasUsadas,
        racha: nuevaRacha,
        mejora: tendencia,
        tipo_problema: 'fracciones',
      },
      tiempo_segundos: elapsedSeconds,
    })
  }

  // -------- Decidir nivel + devolver sample/decision para entrenar
  const decidirNivel = async (
    nuevoAciertos: number,
    nuevosErrores: number,
    es_correcto: boolean
  ): Promise<{ nuevoNivel: Nivel; decision: Resultado; sample: Sample }> => {
    let nuevoNivel = nivelActual
    let decision: Resultado = 'mantiene'

    const tiempoCat: Tiempo = getTiempoCategoria(elapsedSeconds)
    const nuevaRacha = es_correcto ? racha + 1 : 0
    const tendencia: Mejora = getTendencia([...historial, es_correcto])

    const sample: Sample = {
      nivel: nivelActual,
      aciertos: nuevoAciertos,
      errores: nuevosErrores,
      tiempo_promedio: tiempoCat,
      pistas_usadas: pistasUsadas,
      racha: nuevaRacha,
      mejora: tendencia,
      tipo_problema: 'fracciones',
    }

    if (decisionTree) {
      decision = decisionTree.predict(sample) as Resultado

      if (decision === 'sube' && nivelActual < 3) {
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('¡Subiste de nivel! 🚀', { icon: '🚀' })
        setNivelActual(nuevoNivel)
      } else if (decision === 'baja' && nivelActual > 1 && nuevosErrores >= 4) {
        // Baja algo más restrictiva
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('Bajaste de nivel 📉', { icon: '📉' })
        setNivelActual(nuevoNivel)
      }
    } else {
      // Fallback más conservador
      if (nuevoAciertos >= 3 && nivelActual < 3) {
        decision = 'sube'
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        setNivelActual(nuevoNivel)
      } else if (nuevosErrores >= 5 && nivelActual > 1) {
        decision = 'baja'
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        setNivelActual(nuevoNivel)
      } else {
        decision = 'mantiene'
      }
    }

    console.log('[DT] predict(sample)=', decision, 'sample=', sample)
    return { nuevoNivel, decision, sample }
  }

  const reiniciarEjercicio = (nuevoNivel: Nivel) => {
    const q = generarPregunta(nuevoNivel)
    setPregunta(q)
    setRespuestaFinal({ numerador: '', denominador: '' })
    setHintIndex(0)
    setPistasUsadas(0)
    reset()
    start()
  }

  const manejarError = async () => {
    // Ejecutar inmediatamente al primer error
    await registrarRespuesta(false)
    const nuevosErrores = errores + 1
    setErrores(nuevosErrores)

    setRacha(0)
    setHistorial((h) => [...h, false])
    toast.error('❌ Respuesta incorrecta. Nueva pregunta.')

    const { nuevoNivel, decision, sample } = await decidirNivel(0, nuevosErrores, false)

    // 🧠 Guardar ejemplo real + evaluar precisión
    await appendTrainingExample({ ...sample, resultado: decision }, setDecisionTree)

    nextWithDelay(1200, nuevoNivel)
  }

  const verificar = async () => {
    const { a, b, denominador1, denominador2 } = pregunta!
    const esperadoNum = a * b
    const esperadoDen = denominador1 * denominador2

    const userNum = parseInt(respuestaFinal.numerador)
    const userDen = parseInt(respuestaFinal.denominador)

    const numCorrecto = userNum === esperadoNum
    const denCorrecto = userDen === esperadoDen

    if (numCorrecto && denCorrecto) {
      await registrarRespuesta(true)
      const nuevosAciertos = aciertos + 1
      setAciertos(nuevosAciertos)
      setErrores(0)
      setRacha((r) => r + 1)
      setHistorial((h) => [...h, true])

      toast.success('🎉 ¡Correcto!')
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })

      const { nuevoNivel, decision, sample } = await decidirNivel(nuevosAciertos, 0, true)

      // 🧠 Guardar ejemplo real + evaluar precisión
      await appendTrainingExample({ ...sample, resultado: decision }, setDecisionTree)

      nextWithDelay(1200, nuevoNivel)
    } else {
      toast.error('Multiplica numeradores y denominadores correctamente.')
      if (guidedMode) setHintIndex((i) => Math.min(i + 1, 2))
      await manejarError()
    }
  }

  const hints = buildHints(pregunta!)
  const coachMsg = (() => {
    const f = historial.slice(-1)[0]
    if (f === undefined) return 'Multiplica numeradores y denominadores. ¡Tú puedes!'
    return f ? '¡Excelente! Mantén el método.' : 'Primero numeradores, luego denominadores. Puedes pedir una pista.'
  })()

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <div className="mx-auto bg-card flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
        <div className="w-full flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            ✅ Aciertos: <b>{aciertos}</b> | ❌ Errores: <b>{errores}</b> | 🔁 Racha: <b>{racha}</b> | 💡 Pistas: <b>{pistasUsadas}</b>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold">
              Nivel {nivelActual}
            </span>
            <button
              onClick={() => setShowGuidePanel(v => !v)}
              className="px-3 py-1 rounded-md border border-border text-sm hover:bg-input"
            >
              {showGuidePanel ? 'Ocultar guía' : 'Mostrar guía'}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {guidedMode && showGuidePanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden"
            >
              <div className="rounded-lg border border-border p-4 bg-background mt-4">
                <h3 className="font-semibold mb-2 text-foreground">Cómo se multiplican fracciones</h3>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground">
                  <li>Multiplica <b>numeradores</b> entre sí.</li>
                  <li>Multiplica <b>denominadores</b> entre sí.</li>
                  <li>No simplifiques en este juego.</li>
                </ol>
                {hints[hintIndex] && (
                  <div className="rounded-md border border-dashed border-ring/40 p-3 text-sm bg-white mt-3">
                    <div className="font-medium">{hints[hintIndex].title}</div>
                    <div className="text-foreground/80">{hints[hintIndex].text}</div>
                  </div>
                )}
                <button
                  onClick={() => { setHintIndex(i => Math.min(i + 1, 2)); setPistasUsadas(p => p + 1) }}
                  className="mt-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground font-medium hover:opacity-90"
                >
                  Una pista más
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mensaje del profe */}
        <div className="w-full rounded-md border border-border p-3 bg-white text-sm">
          <span className="font-medium">Profe:</span> {coachMsg}
        </div>

        <p className="text-lg text-center text-foreground">{pregunta!.contexto}</p>

        <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground mb-2">Fracción 1</span>
            <div className="bg-popover rounded-lg p-4 border border-border">
              <FractionPretty numerador={pregunta!.a} denominador={pregunta!.denominador1} size="text-5xl" accent />
            </div>
            <div className="mt-2">
              <FractionCanvas numerador={pregunta!.a} denominador={pregunta!.denominador1} />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-5xl font-bold text-foreground">×</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground mb-2">Fracción 2</span>
            <div className="bg-popover rounded-lg p-4 border border-border">
              <FractionPretty numerador={pregunta!.b} denominador={pregunta!.denominador2} size="text-5xl" accent />
            </div>
            <div className="mt-2">
              <FractionCanvas numerador={pregunta!.b} denominador={pregunta!.denominador2} />
            </div>
          </div>
        </div>

        <p className="text-center font-medium text-foreground">
          Responde la fracción <b>resultado</b> de la multiplicación.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <input
              ref={finalNumeradorRef}
              type="number"
              value={respuestaFinal.numerador}
              onChange={(e) => setRespuestaFinal(prev => ({ ...prev, numerador: e.target.value }))}
              placeholder="?"
              className="w-28 text-center p-2 text-2xl bg-white text-foreground border border-border rounded"
            />
            <div className="h-1 bg-muted w-28 border-b border-border" />
            <input
              ref={finalDenominadorRef}
              type="number"
              value={respuestaFinal.denominador}
              onChange={(e) => setRespuestaFinal(prev => ({ ...prev, denominador: e.target.value }))}
              placeholder="?"
              className="w-28 text-center p-2 text-2xl bg-white text-foreground border border-border rounded"
            />
          </div>

          <div className="bg-popover rounded-xl p-4 border border-border">
            <FractionPretty
              numerador={respuestaFinal.numerador || ' '}
              denominador={respuestaFinal.denominador || ' '}
              size="text-5xl"
              accent
            />
          </div>
        </div>

        <div className="w-full max-w-sm flex gap-2">
          <button
            onClick={() => withLock(verificar)}
            disabled={isSubmitting}
            className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-lg transition"
          >
            {isSubmitting ? 'Verificando…' : 'Verificar respuesta'}
          </button>
          {guidedMode && (
            <button
              onClick={() => { setHintIndex(i => Math.min(i + 1, 2)); setPistasUsadas(p => p + 1) }}
              className="px-3 py-2 rounded-lg border border-border hover:bg-input text-sm"
            >
              Una pista más
            </button>
          )}
        </div>
      </div>
    </>
  )
}
