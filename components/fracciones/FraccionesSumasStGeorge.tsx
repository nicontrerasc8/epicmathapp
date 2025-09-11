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
const temaPeriodoId = 'ea5de085-2e52-40ac-b975-8931d08b9e44'

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
// ====== Constantes del modelo (clave para entrenar/guardar) ======
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

type Nivel = 1 | 2 | 3
type Tiempo = 'rapido' | 'moderado' | 'lento'
type Mejora = 'mejora' | 'estable' | 'empeora'
type Resultado = 'sube' | 'baja' | 'mantiene'

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

interface Pregunta {
  a: number
  b: number
  operador: string
  denominador1: number
  denominador2: number
  contexto: string
}



// ---------- Utils matemáticas ----------
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
const mcm = (a: number, b: number): number => Math.abs((a * b) / gcd(a, b))
const simplificarFraccion = (numerador: number, denominador: number) => {
  const d = gcd(numerador, denominador)
  return { numerador: numerador / d, denominador: denominador / d }
}
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

// ---------- Helpers adaptativos ----------
const getTiempoCategoria = (segundos: number): Tiempo => {
  if (segundos <= 20) return 'rapido'
  if (segundos <= 40) return 'moderado'
  return 'lento'
}
const getTendencia = (hist: boolean[]): Mejora => {
  if (hist.length < 3) return 'estable'
  const ultimos = hist.slice(-3)
  const aciertos = ultimos.filter(Boolean).length
  if (aciertos === 3) return 'mejora'
  if (aciertos === 0) return 'empeora'
  return 'estable'
}

// ---------- Loading ----------
const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      <p className="text-white font-semibold">Procesando…</p>
    </div>
  </div>
)

// ---------- Árbol de decisión: cargar + upsert/entrenar ----------
async function cargarModelo(setDecisionTree: (dt: any) => void) {
  console.log('[DT] Cargando modelo tema_id=', temaPeriodoId)
  const { data, error } = await supabase
    .from('decision_trees')
    .select('modelo')
    .eq('tema', temaPeriodoId)
    .single()

  if (error) {
    console.error('[DT] Error cargando modelo:', error)
    return
  }

  if (!data?.modelo) {
    console.warn('[DT] No hay modelo. Creando fila vacía por upsert…')
    const empty = { trainingData: [] as TrainingRow[], className: CLASS_NAME, features: FEATURES }
    const up = await supabase
      .from('decision_trees')
      .upsert({ tema: temaPeriodoId, modelo: empty }, { onConflict: 'tema' })
    if (up.error) console.error('[DT] Error creando fila vacía:', up.error)
    return
  }

  const { trainingData, className, features } = data.modelo
  console.log('[DT] Modelo cargado. Ejemplos=', trainingData?.length ?? 0)
  try {
    const dt = new DecisionTree(trainingData ?? [], className ?? CLASS_NAME, features ?? FEATURES)
    setDecisionTree(dt)
    console.log('[DT] Árbol reconstruido en memoria ✅')
  } catch (e) {
    console.error('[DT] Error reconstruyendo árbol:', e)
  }
}

async function appendTrainingExample(
  setDecisionTree: (dt: any) => void,
  example: TrainingRow
) {
  console.log('[DT] Agregando ejemplo de entrenamiento:', example)

  // 1) Leer modelo actual (o crear base vacía)
  const { data, error } = await supabase
    .from('decision_trees')
    .select('modelo')
    .eq('tema', temaPeriodoId)
    .single()

  let trainingData: TrainingRow[] = []
  let className = CLASS_NAME
  let features: any = FEATURES

  if (error) {
    console.error('[DT] Error leyendo modelo antes de upsert:', error)
  } else if (data?.modelo) {
    trainingData = (data.modelo.trainingData as TrainingRow[]) ?? []
    className = (data.modelo.className as string) ?? CLASS_NAME
    features = (data.modelo.features as string[]) ?? FEATURES
  } else {
    console.warn('[DT] No había modelo, se creará uno nuevo')
  }

  // 2) Añadir ejemplo
  trainingData.push(example)

  // 3) Guardar con upsert (MUY IMPORTANTE: onConflict por tema_id)
  const modelo = { trainingData, className, features }
  const { data: upserted, error: upErr } = await supabase
    .from('decision_trees')
    .upsert({ tema: temaPeriodoId, modelo }, { onConflict: 'tema' })
    .select()

  if (upErr) {
    console.error('[DT] Error al upsert del modelo:', upErr)
    return
  }
  console.log('[DT] Modelo upserteado correctamente. Total ejemplos=', trainingData.length, 'Resp:', upserted)

  // 4) Re-entrenar en memoria
  try {
    const dt = new DecisionTree(trainingData, className, features)
    setDecisionTree(dt)
    console.log('[DT] Árbol re-entrenado en memoria ✅')
  } catch (e) {
    console.error('[DT] Error re-entrenando árbol en memoria:', e)
  }
}

// ---------- Generación de denominadores ----------
const lcmBound = (a: number, b: number) => Math.abs((a * b) / gcd(a, b))

const pickDenominators = (nivel: Nivel): { d1: number; d2: number } => {
  let d1 = 0, d2 = 0
  if (nivel === 1) {
    const bases = [2, 3, 4, 5, 6]
    while (true) {
      const base = bases[Math.floor(Math.random() * bases.length)]
      const mult = [2, 3][Math.floor(Math.random() * 2)]
      d1 = base
      d2 = base * mult
      if (d2 <= 10 && lcmBound(d1, d2) <= 20) break
    }
  } else if (nivel === 2) {
    while (true) {
      d1 = randInt(3, 10)
      do { d2 = randInt(3, 10) } while (d2 === d1)
      if (gcd(d1, d2) > 1 && lcmBound(d1, d2) <= 36) break
    }
  } else {
    while (true) {
      d1 = randInt(4, 12)
      do { d2 = randInt(4, 12) } while (d2 === d1)
      const l = lcmBound(d1, d2)
      const g = gcd(d1, d2)
      const wantCoprime = Math.random() < 0.2
      if (l <= 48 && (!wantCoprime || g === 1)) break
    }
  }
  return { d1, d2 }
}

const generarPregunta = (nivel: Nivel): Pregunta => {
  const { d1: denominador1, d2: denominador2 } = pickDenominators(nivel)
  const cap = (d: number) => Math.max(1, Math.floor(d / 3))
  const a = randInt(1, cap(denominador1))
  const b = randInt(1, cap(denominador2))
  const contextos = [
    `María tiene ${a}/${denominador1} de una torta y recibe ${b}/${denominador2} más. ¿Cuánto tiene ahora?`,
    `Pedro comió ${a}/${denominador1} de una pizza y luego ${b}/${denominador2} más. ¿Cuánto comió en total?`,
    `Ana coloreó ${a}/${denominador1} de un dibujo y después ${b}/${denominador2} más. ¿Cuánto coloreó en total?`,
    `Carlos lee ${a}/${denominador1} de un libro y luego ${b}/${denominador2} más. ¿Cuánto ha leído en total?`,
  ]
  return { a, b, operador: '+', denominador1, denominador2, contexto: contextos[Math.floor(Math.random() * contextos.length)] }
}

// ---------- Pistas ----------
const buildHints = (p: Pregunta) => {
  const denComun = mcm(p.denominador1, p.denominador2)
  const nuevoA = p.a * (denComun / p.denominador1)
  const nuevoB = p.b * (denComun / p.denominador2)
  const suma = nuevoA + nuevoB
  const simple = simplificarFraccion(suma, denComun)
  return [
    { title: 'Pista 1 — Denominador común', text: `Busca el MCM entre ${p.denominador1} y ${p.denominador2}.` },
    { title: 'Pista 2 — Equivalentes', text: `Convierte ${p.a}/${p.denominador1} y ${p.b}/${p.denominador2} al denominador ${denComun}.` },
    { title: 'Pista 3 — Suma', text: `Suma ${nuevoA} + ${nuevoB}. Denominador: ${denComun}.` },
    { title: 'Pista 4 — Simplifica', text: `Simplifica: ${suma}/${denComun} → ${simple.numerador}/${simple.denominador}.` },
  ]
}

// ---------- Componente principal ----------
export function FraccionesSumasStGeorgeGameGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [decisionTree, setDecisionTree] = useState<any>(null)

  const [respuestaFinal, setRespuestaFinal] = useState({ numerador: '', denominador: '' })
  const [respuestaSimplificada, setRespuestaSimplificada] = useState({ numerador: '', denominador: '' })
  const [mostrarInputSimplificado, setMostrarInputSimplificado] = useState(false)
  const [mcmUsuario, setMcmUsuario] = useState('')
  const [mostrarPasoMCM, setMostrarPasoMCM] = useState(true)

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

  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [racha, setRacha] = useState(0)
  const [pistasUsadas, setPistasUsadas] = useState(0)
  const [historial, setHistorial] = useState<boolean[]>([])
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)

  const [guidedMode, setGuidedMode] = useState(true)
  const [hintIndex, setHintIndex] = useState(0)
  const [showGuidePanel, setShowGuidePanel] = useState(true)

  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const finalNumeradorRef = useRef<HTMLInputElement>(null)
  const finalDenominadorRef = useRef<HTMLInputElement>(null)
  const { student } = useStudent()
  const initRef = useRef(false)

  async function enriquecerModeloConDataset(n = 1000) {
  console.log(`[DT] Enriqueciendo modelo con ${n} ejemplos sintéticos…`)

  // 1) Leer modelo actual
  const { data, error } = await supabase
    .from('decision_trees')
    .select('modelo')
    .eq('tema', temaPeriodoId)
    .single()

  if (error) {
    console.error('[DT] Error leyendo modelo:', error)
    return
  }

  let trainingData: TrainingRow[] = []
  let className = CLASS_NAME
  let features: any = FEATURES

  if (data?.modelo) {
    trainingData = (data.modelo.trainingData as TrainingRow[]) ?? []
    className = data.modelo.className ?? CLASS_NAME
    features = data.modelo.features ?? FEATURES
  }

  // 2) Generar dataset sintético
  const synthetic = generarDataset(n)

  // 3) Unir con dataset actual
  const merged = [...trainingData, ...synthetic]

  // 4) Guardar con upsert
  const modelo = { trainingData: merged, className, features }
  const { error: upErr } = await supabase
    .from('decision_trees')
    .upsert({ tema: temaPeriodoId, modelo }, { onConflict: 'tema' })

  if (upErr) {
    console.error('[DT] Error al enriquecer modelo:', upErr)
  } else {
    console.log(`[DT] Modelo enriquecido. Ahora tiene ${merged.length} ejemplos.`)
    toast.success(`Modelo enriquecido con ${n} ejemplos. Total: ${merged.length}`)
  }
}


  // init
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

    // 🔹 primero carga el modelo existente
    await cargarModelo(setDecisionTree)

    // 🔹 luego lo enriqueces con ejemplos sintéticos
    await enriquecerModeloConDataset(500)
  })()
}, [student])


  if (!pregunta) return null

  // ======== Registro con métricas extendidas (SIN CAMBIAR TIPOS) ========
  const registrarRespuestaFinal = async (es_correcto: boolean) => {
    if (!student?.id || !temaPeriodoId || !pregunta) return

    const nuevaRacha = es_correcto ? racha + 1 : 0
    const tendencia = getTendencia([...historial, es_correcto])
    const tiempoCat: Tiempo = getTiempoCategoria(elapsedSeconds)

    console.log('[LOG] insertStudentResponse', {
      nivel: nivelActual, es_correcto, tiempo: elapsedSeconds, tiempoCat, pistasUsadas, nuevaRacha, tendencia
    })

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
      respuesta: {
        numerador: parseInt(respuestaFinal.numerador),
        denominador: parseInt(respuestaFinal.denominador),
        simplificado: mostrarInputSimplificado,
        tiempo_promedio: tiempoCat,
        pistas_usadas: pistasUsadas,
        racha: nuevaRacha,
        mejora: tendencia,
      },
      tiempo_segundos: elapsedSeconds,
    })
  }

  function generarDataset(n = 10000): TrainingRow[] {
  const niveles: Nivel[] = [1, 2, 3]
  const mejoras: Mejora[] = ["mejora", "estable", "empeora"]
  const tiempos: Tiempo[] = ["rapido", "moderado", "lento"]

  const dataset: TrainingRow[] = []

  for (let i = 0; i < n; i++) {
    const nivel = niveles[Math.floor(Math.random() * niveles.length)]
    const aciertos = Math.floor(Math.random() * 4) // 0-3
    const errores = Math.floor(Math.random() * 4) // 0-3
    const racha = Math.floor(Math.random() * 5)   // 0-4
    const pistas_usadas = Math.floor(Math.random() * 4)
    const mejora = mejoras[Math.floor(Math.random() * mejoras.length)]
    const tiempo_promedio = tiempos[Math.floor(Math.random() * tiempos.length)]

    let resultado: Resultado = "mantiene"
    if (aciertos >= 3 && errores === 0 && mejora === "mejora") {
      resultado = nivel < 3 ? "sube" : "mantiene"
    } else if (errores >= 3 || mejora === "empeora") {
      resultado = nivel > 1 ? "baja" : "mantiene"
    }

    dataset.push({
      nivel,
      aciertos,
      errores,
      racha,
      mejora,
      pistas_usadas,
      tiempo_promedio,
      tipo_problema: "fracciones",
      resultado
    })
  }

  return dataset
}




  // ======== Decidir nivel y devolver sample/decision para entrenar ========
  const decidirNivel = async (
    nuevoAciertos: number,
    nuevosErrores: number,
    es_correcto: boolean
  ): Promise<{ nuevoNivel: Nivel; decision: Resultado; sample: Sample }> => {
    const tiempoCat: Tiempo = getTiempoCategoria(elapsedSeconds)
    const nuevaRacha = es_correcto ? racha + 1 : 0
    const tendencia = getTendencia([...historial, es_correcto])

    generarDataset(1000)

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

    let decision: Resultado = 'mantiene'
    let nuevoNivel = nivelActual

    if (decisionTree) {
      decision = decisionTree.predict(sample) as Resultado
      console.log('[DT] predict(sample)=', decision, 'sample=', sample)
      if (decision === 'sube' && nivelActual < 3) {
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('¡Subiste de nivel! 🚀', { icon: '🚀' })
        setNivelActual(nuevoNivel)
    
      } else if (decision === 'baja' && nivelActual > 1) {
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('Bajaste de nivel 📉', { icon: '📉' })
        setNivelActual(nuevoNivel)
    
      }
    } else {
      // Fallback por si no hay árbol
      if (nuevoAciertos >= 3 && nivelActual < 3) {
        decision = 'sube'
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        setNivelActual(nuevoNivel); 
      } else if (nuevosErrores >= 3 && nivelActual > 1) {
        decision = 'baja'
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        setNivelActual(nuevoNivel);
      } else {
        decision = 'mantiene'
      }
      console.log('[DT] Fallback decision=', decision, 'sample=', sample)
    }

    return { nuevoNivel, decision, sample }
  }

  const reiniciarEjercicio = (nivel: Nivel) => {
    const q = generarPregunta(nivel)
    setPregunta(q)
    setRespuestaFinal({ numerador: '', denominador: '' })
    setRespuestaSimplificada({ numerador: '', denominador: '' })
    setMostrarInputSimplificado(false)
    setMostrarPasoMCM(true)
    setMcmUsuario('')

    setHintIndex(0)
    setPistasUsadas(0)
    reset()
    start()
  }

  const manejarError = async () => {
    // CAMBIO: Evaluar inmediatamente al primer error
    await registrarRespuestaFinal(false)
    const nuevosErrores = errores + 1
    setErrores(nuevosErrores)
  
    setRacha(0)
    setHistorial(prev => [...prev, false])

    toast.error('❌ Respuesta incorrecta. Nueva pregunta.')
    const { nuevoNivel, decision, sample } = await decidirNivel(0, nuevosErrores, false)

    // Entrenamiento: guardamos el ejemplo con etiqueta "decision"
    await appendTrainingExample(setDecisionTree, { ...sample, resultado: decision })

    setTimeout(() => reiniciarEjercicio(nuevoNivel), 1400)
  }

  const verificar = async () => {
    if (!pregunta) return
    const { a, b, denominador1, denominador2 } = pregunta
    const userNum = parseInt(respuestaFinal.numerador)
    const userDen = parseInt(respuestaFinal.denominador)

    const esComun = userDen > 0 && userDen % denominador1 === 0 && userDen % denominador2 === 0
    const esperadoNumConUserDen = a * (userDen / denominador1) + b * (userDen / denominador2)
    const numCorrecto = esComun && userNum === esperadoNumConUserDen

    if (numCorrecto) {
      toast.success('Bien hecho. Ahora simplifica la fracción.')
      setMostrarInputSimplificado(true)
    } else {
      toast.error('Revisa denominador común y numeradores.')
      if (guidedMode) setHintIndex(i => Math.max(i, 1))
      // CAMBIO: Llamar directamente a manejarError
      await manejarError()
    }
  }

  // Reemplazar la función verificarSimplificada:
  const verificarSimplificada = async () => {
    if (!pregunta) return
    const { a, b, denominador1, denominador2 } = pregunta
    const denComun = mcm(denominador1, denominador2)
    const nuevoA = a * (denComun / denominador1)
    const nuevoB = b * (denComun / denominador2)
    const resultado = simplificarFraccion(nuevoA + nuevoB, denComun)

    const userNum = parseInt(respuestaSimplificada.numerador)
    const userDen = parseInt(respuestaSimplificada.denominador)
    const userSimp = simplificarFraccion(userNum, userDen)

    const esCorrecto = resultado.numerador === userSimp.numerador && resultado.denominador === userSimp.denominador

    if (esCorrecto) {
      await registrarRespuestaFinal(true)
      const nuevosAciertos = aciertos + 1
      setAciertos(nuevosAciertos)
      setErrores(0)
      setRacha(r => r + 1)
      setHistorial(prev => [...prev, true])

      toast.success('🎉 ¡Muy bien! Fracción simplificada correcta.')
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })

      const { nuevoNivel, decision, sample } = await decidirNivel(nuevosAciertos, 0, true)

      // Entrenamiento: guardamos el ejemplo con etiqueta "decision"
      await appendTrainingExample(setDecisionTree, { ...sample, resultado: decision })

      nextWithDelay(1600, nuevoNivel)
    } else {
      toast.error('⚠️ Aún puedes simplificar mejor.')
      if (guidedMode) setHintIndex(3)
      // CAMBIO: Llamar directamente a manejarError
      await manejarError()
    }
  }

  // ====== Evaluar precisión del modelo ======
function splitData<T>(data: T[], testRatio = 0.2) {
  const shuffled = [...data].sort(() => Math.random() - 0.5)
  const testSize = Math.floor(data.length * testRatio)
  return {
    train: shuffled.slice(testSize),
    test: shuffled.slice(0, testSize),
  }
}

function evaluarPrecision(data: TrainingRow[]) {
  if (data.length < 5) return null // muy pocos ejemplos
  const { train, test } = splitData(data, 0.2)
  const dt = new DecisionTree(train, CLASS_NAME, FEATURES)

  let correctos = 0
  test.forEach((row) => {
    const pred = dt.predict(row)
    if (pred === row.resultado) correctos++
  })

  return correctos / test.length
}

// ====== Modificado appendTrainingExample con evaluación ======
async function appendTrainingExample(
  setDecisionTree: (dt: any) => void,
  example: TrainingRow
) {
  console.log('[DT] Agregando ejemplo de entrenamiento:', example)

  // 1) Leer modelo actual (o crear base vacía)
  const { data, error } = await supabase
    .from('decision_trees')
    .select('modelo')
    .eq('tema', temaPeriodoId)
    .single()

  let trainingData: TrainingRow[] = []
  let className = CLASS_NAME
  let features: any = FEATURES

  if (!error && data?.modelo) {
    trainingData = (data.modelo.trainingData as TrainingRow[]) ?? []
    className = (data.modelo.className as string) ?? CLASS_NAME
    features = (data.modelo.features as string[]) ?? FEATURES
  }

  // 2) Añadir ejemplo
  trainingData.push(example)

  // 3) Guardar con upsert
  const modelo = { trainingData, className, features }
  const { data: upserted, error: upErr } = await supabase
    .from('decision_trees')
    .upsert({ tema: temaPeriodoId, modelo }, { onConflict: 'tema' })
    .select()

  if (upErr) {
    console.error('[DT] Error al upsert del modelo:', upErr)
    return
  }
  console.log('[DT] Modelo actualizado. Total ejemplos=', trainingData.length)

  // 4) Re-entrenar en memoria
  try {
    const dt = new DecisionTree(trainingData, className, features)
    setDecisionTree(dt)
    console.log('[DT] Árbol re-entrenado en memoria ✅')

    // 5) 🔍 Evaluar precisión (modo prueba)
    const acc = evaluarPrecision(trainingData)
    if (acc !== null) {
      const porcentaje = (acc * 100).toFixed(1)
      console.log(`[DT] Precisión del modelo: ${porcentaje}%`)
      toast.success(`📊 Precisión actual: ${porcentaje}%`)
    } else {
      console.log('[DT] No hay suficientes ejemplos para evaluar precisión')
    }
  } catch (e) {
    console.error('[DT] Error re-entrenando árbol en memoria:', e)
  }
}


 

  const hints = buildHints(pregunta)

  return (
    <>
      {isSubmitting && <LoadingOverlay />}
      <div className="mx-auto bg-card w-full flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
        <div className="w-full flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            ✅ Aciertos: <b>{aciertos}</b> | ❌ Errores: <b>{errores}</b> | 🔁 Racha: <b>{racha}</b> | 💡 Pistas: <b>{pistasUsadas}</b>
          </div>
          <button
            onClick={() => setShowGuidePanel(v => !v)}
            className="px-3 py-1 rounded-md border border-border text-sm hover:bg-input"
          >
            {showGuidePanel ? 'Ocultar guía' : 'Mostrar guía'}
          </button>
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
                <h3 className="font-semibold mb-2 text-foreground">Guía</h3>
                {hints[hintIndex] && (
                  <div className="rounded-md border border-dashed border-ring/40 p-3 text-sm bg-white">
                    <div className="font-medium">{hints[hintIndex].title}</div>
                    <div className="text-foreground/80">{hints[hintIndex].text}</div>
                  </div>
                )}
                <button
                  onClick={() => { setHintIndex(i => Math.min(i + 1, hints.length - 1)); setPistasUsadas(p => p + 1) }}
                  className="mt-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground font-medium hover:opacity-90"
                >
                  Pedir pista
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <h2 className="text-2xl font-bold text-primary">Nivel {nivelActual}</h2>
        <p className="text-lg text-center text-foreground">{pregunta.contexto}</p>

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
            <span className="text-5xl font-bold text-foreground">+</span>
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

        {mostrarPasoMCM ? (
          <div className="w-full flex flex-col items-center space-y-2">
            <p className="text-center font-medium text-foreground">
              Paso 1: Calcula el <b>MCM</b> entre {pregunta.denominador1} y {pregunta.denominador2}.
            </p>
            <input
              type="number"
              value={mcmUsuario}
              onChange={(e) => setMcmUsuario(e.target.value)}
              className="w-full max-w-xs text-center p-2 text-xl bg-white text-foreground border border-border rounded"
              placeholder="Mínimo común múltiplo"
            />
            <button
              onClick={() => withLock(async () => {
                const esperado = mcm(pregunta.denominador1, pregunta.denominador2)
                if (parseInt(mcmUsuario) === esperado) {
                  setMostrarPasoMCM(false)
                  toast.success('Correcto. Ahora resuelve la suma.')
                } else {
                  toast.error('Ese no es el MCM.')
                  if (guidedMode) setHintIndex(0)
                  // CAMBIO: Llamar directamente a manejarError
                  await manejarError()
                }
              })}
              disabled={isSubmitting}
              className="w-full max-w-xs bg-primary text-primary-foreground font-bold py-2 rounded-lg transition"
            >
              {isSubmitting ? 'Validando…' : 'Validar MCM'}
            </button>
          </div>
        ) : (
          <>
            <p className="text-center font-medium text-foreground">
              Paso 2: Suma las fracciones con denominador común. No simplifiques aún.
            </p>
            <div className="flex flex-col items-center gap-2">
              <input
                ref={finalNumeradorRef}
                type="number"
                value={respuestaFinal.numerador}
                onChange={(e) => setRespuestaFinal(prev => ({ ...prev, numerador: e.target.value }))}
                placeholder="?"
                className="w-24 text-center p-2 text-xl bg-white text-foreground border border-border rounded"
              />
              <div className="h-1 bg-muted w-24 border-b border-border" />
              <input
                ref={finalDenominadorRef}
                type="number"
                value={respuestaFinal.denominador}
                onChange={(e) => setRespuestaFinal(prev => ({ ...prev, denominador: e.target.value }))}
                placeholder="?"
                className="w-24 text-center p-2 text-xl bg-white text-foreground border border-border rounded"
              />
            </div>
            <button
              onClick={() => withLock(verificar)}
              disabled={isSubmitting}
              className="w-full max-w-sm bg-purple-500 text-white font-bold py-2 rounded-lg transition"
            >
              {isSubmitting ? 'Verificando…' : 'Verificar respuesta'}
            </button>
          </>
        )}

        {mostrarInputSimplificado && (
          <div className="w-full space-y-2">
            <p className="text-center font-medium text-foreground">
              Paso 3: Simplifica la fracción.
            </p>
            <div className="flex flex-col items-center gap-2">
              <input
                type="number"
                value={respuestaSimplificada.numerador}
                onChange={(e) => setRespuestaSimplificada(prev => ({ ...prev, numerador: e.target.value }))}
                placeholder="?"
                className="w-24 text-center p-2 text-xl bg-white text-foreground border border-border rounded"
              />
              <div className="h-1 bg-muted w-24 border-b border-border" />
              <input
                type="number"
                value={respuestaSimplificada.denominador}
                onChange={(e) => setRespuestaSimplificada(prev => ({ ...prev, denominador: e.target.value }))}
                placeholder="?"
                className="w-24 text-center p-2 text-xl bg-white text-foreground border border-border rounded"
              />
            </div>
            <button
              onClick={() => withLock(verificarSimplificada)}
              disabled={isSubmitting}
              className="w-full max-w-sm bg-accent text-accent-foreground font-bold py-2 rounded-lg transition"
            >
              {isSubmitting ? 'Verificando…' : 'Verificar simplificación'}
            </button>
          </div>
        )}

        {/* Pistas */}

      </div>
    </>
  )
}
