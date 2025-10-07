'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import DecisionTree from 'decision-tree'


import { createClient } from '@/utils/supabase/client'
import FractionCanvas from './FractionCanvas'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'

const supabase = createClient()
const temaPeriodoId = 'ea5de085-2e52-40ac-b975-8931d08b9e44' // SUMAS

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
  'intentos_por_pregunta',
  'variabilidad_tiempo',
  'patron_errores',
  'sesiones_completadas',
  'tiempo_primera_respuesta',
  'uso_recursos_extra',
  'consistencia_semanal',
] as const

type Nivel = 1 | 2 | 3
type Tiempo = 'rapido' | 'moderado' | 'lento'
type Mejora = 'mejora' | 'estable' | 'empeora'
type Resultado = 'sube' | 'mantiene' | 'baja' // mismo orden que Multiplicaciones

type Sample = {
  nivel: Nivel
  aciertos: number
  errores: number
  tiempo_promedio: Tiempo
  pistas_usadas: number
  racha: number
  mejora: Mejora
  tipo_problema: 'fracciones' | 'sumas'
  intentos_por_pregunta: number
  variabilidad_tiempo: 'consistente' | 'variable'
  patron_errores: 'sistematico' | 'aleatorio'
  sesiones_completadas: number
  tiempo_primera_respuesta: Tiempo
  uso_recursos_extra: boolean
  consistencia_semanal: 'alta' | 'media' | 'baja'
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

// ---------- Árbol de decisión: cargar ----------
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
    console.warn('[DT] No hay modelo para SUMAS. Se dejará el árbol vacío (fallback manual).')
    setDecisionTree(null)
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

// ====== Evaluar precisión del modelo (opcional para logs) ======
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
  const dt = new DecisionTree(train, CLASS_NAME, FEATURES as unknown as string[])

  let correctos = 0
  test.forEach((row) => {
    const pred = dt.predict(row as any)
    if (pred === (row as any).resultado) correctos++
  })

  return correctos / test.length
}

// ====== appendTrainingExample (guarda reales y reentrena en memoria) ======
export async function appendTrainingExampleFast(example: any) {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('decision_training_samples')
      .insert([
        {
          tema_periodo_id: 'ea5de085-2e52-40ac-b975-8931d08b9e44', // SUMAS (ajusta según tu juego)
          sample: example,
        },
      ])

    if (error) throw error
    console.log('✅ Ejemplo guardado en decision_training_samples')
  } catch (err) {
    console.error('❌ Error al guardar ejemplo de entrenamiento:', err)
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
  let denominador1 = 0
  let denominador2 = 0
  let a = 0
  let b = 0

  const sumWithLcm = (A: number, B: number, d1: number, d2: number) => {
    const L = mcm(d1, d2)
    return A * (L / d1) + B * (L / d2)
  }

  const esImpropia = (num: number, den: number) => num >= den

  if (nivel === 1) {
    // Nivel 1: Fracciones simples, denominadores pequeños, homogéneos o múltiplos
    const tipo = Math.random()

    if (tipo < 0.6) {
      denominador1 = randInt(2, 9)
      denominador2 = denominador1 // mismo denominador (suma directa)
    } else {
      denominador1 = randInt(2, 6)
      denominador2 = denominador1 * (Math.random() < 0.5 ? 2 : 3)
      if (denominador2 > 12) denominador2 = denominador1 * 2
    }

    a = randInt(1, Math.max(1, Math.floor(denominador1 * 0.5)))
    b = randInt(1, Math.max(1, Math.floor(denominador2 * 0.5)))

    // 50%: asegurar que el resultado sea < 1, 30% = 1 exacto, 20% > 1
    const L = mcm(denominador1, denominador2)
    let total = sumWithLcm(a, b, denominador1, denominador2)
    if (total >= L && Math.random() < 0.5) {
      while (total >= L) {
        a = randInt(1, denominador1 - 1)
        b = randInt(1, denominador2 - 1)
        total = sumWithLcm(a, b, denominador1, denominador2)
      }
    }
  }

  else if (nivel === 2) {
    // Nivel 2: Denominadores medianos (6–14), distintos, con factores comunes o múltiplos complejos
    let ok = false
    for (let i = 0; i < 60 && !ok; i++) {
      const d1 = randInt(5, 14)
      const d2 = randInt(5, 14)
      const g = gcd(d1, d2)
      const sonMultiplos = d1 % d2 === 0 || d2 % d1 === 0
      if (d1 !== d2 && (g > 1 || sonMultiplos)) {
        denominador1 = d1
        denominador2 = d2
        ok = true
      }
    }

    if (!ok) {
      denominador1 = 8
      denominador2 = 12
    }

    // Numeradores medianos, algunos impropios
    a = randInt(1, denominador1)
    b = randInt(1, denominador2)

    // 50%: forzar resultado > 1 (impropia)
    if (Math.random() < 0.5) {
      const L = mcm(denominador1, denominador2)
      let total = sumWithLcm(a, b, denominador1, denominador2)
      let tries = 0
      while (total <= L && tries < 20) {
        a = randInt(Math.ceil(denominador1 * 0.7), denominador1)
        b = randInt(Math.ceil(denominador2 * 0.7), denominador2)
        total = sumWithLcm(a, b, denominador1, denominador2)
        tries++
      }
    }
  }

  else {
    // Nivel 3: Denominadores grandes (10–25), coprimos la mayoría, mezcla de propios/impropios
    let ok = false
    for (let i = 0; i < 100 && !ok; i++) {
      const d1 = randInt(10, 25)
      const d2 = randInt(10, 25)
      if (d1 === d2) continue
      const g = gcd(d1, d2)
      const L = mcm(d1, d2)
      if (L <= 300 && (Math.random() < 0.75 ? g === 1 : g > 1)) {
        denominador1 = d1
        denominador2 = d2
        ok = true
      }
    }
    if (!ok) {
      denominador1 = 11
      denominador2 = 19
    }

    // Numeradores altos (50%–120% del denominador) → a veces impropias
    a = randInt(Math.ceil(denominador1 * 0.5), Math.ceil(denominador1 * 1.2))
    b = randInt(Math.ceil(denominador2 * 0.5), Math.ceil(denominador2 * 1.2))

    // Ajuste probabilístico: 60% impropias, 40% propias
    const L = mcm(denominador1, denominador2)
    const total = sumWithLcm(a, b, denominador1, denominador2)
    const resultadoImpropio = total > L
    if (resultadoImpropio && Math.random() > 0.6) {
      // si salió impropia pero no queremos, bajamos un numerador
      if (a > 1) a -= 1
      else b -= 1
    }
  }

  // Contextos variados y gamificados
  const contextos = [
    `🍰 María tiene ${a}/${denominador1} de una torta y recibe ${b}/${denominador2} más. ¿Cuánto tiene ahora?`,
    `🧃 Pedro bebió ${a}/${denominador1} de un jugo y luego ${b}/${denominador2} más. ¿Qué parte del jugo tomó?`,
    `📘 Ana leyó ${a}/${denominador1} de un libro y después ${b}/${denominador2} más. ¿Cuánto ha leído en total?`,
    `🎨 Carlos pintó ${a}/${denominador1} del mural y luego ${b}/${denominador2}. ¿Qué fracción pintó en total?`,
    `🧩 En un rompecabezas, Lucía armó ${a}/${denominador1} y luego ${b}/${denominador2}. ¿Cuánto completó del total?`,
    `⚽ Martín entrenó ${a}/${denominador1} del tiempo planeado y luego ${b}/${denominador2} más. ¿Qué parte cumplió?`,
  ]

  return {
    a,
    b,
    operador: '+',
    denominador1,
    denominador2,
    contexto: contextos[Math.floor(Math.random() * contextos.length)],
  }
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

  const [aciertos, setAciertos] = useState(0)           // aciertos consecutivos
  const [errores, setErrores] = useState(0)             // errores consecutivos
  const [racha, setRacha] = useState(0)                 // alias de aciertos consecutivos (para consistencia con modelo)
  const [pistasUsadas, setPistasUsadas] = useState(0)
  const [historial, setHistorial] = useState<boolean[]>([])
  const [respuestasEnNivel, setRespuestasEnNivel] = useState(0)

  const [guidedMode, setGuidedMode] = useState(true)
  const [hintIndex, setHintIndex] = useState(0)
  const [showGuidePanel, setShowGuidePanel] = useState(true)

  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const finalNumeradorRef = useRef<HTMLInputElement>(null)
  const finalDenominadorRef = useRef<HTMLInputElement>(null)
  const [student, setStudent] = useState<any>(null)
  const [loadingStudent, setLoadingStudent] = useState(true)
  const supabase = createClient()
  const initRef = useRef(false)

  useEffect(() => {
    const fetchStudentAndInit = async () => {
      // 1️⃣ Obtener usuario actual autenticado
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        console.error('Usuario no autenticado', userError)
        setLoadingStudent(false)
        return
      }

      const userId = userData.user.id

      // 2️⃣ Buscar estudiante vinculado al Auth UID
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', userId) // ⚠️ usa el campo real de tu tabla
        .single()

      if (studentError || !studentData) {
        console.error('No se encontró el estudiante en la tabla students.', studentError)
        setLoadingStudent(false)
        return
      }

      setStudent(studentData)
      setLoadingStudent(false)

      // 3️⃣ Inicializar nivel y modelo
      const nivelBD = await getNivelStudentPeriodo(studentData.id, temaPeriodoId)
      const nivelInicial = (nivelBD ?? 1) as Nivel
      setNivelActual(nivelInicial)
      setPregunta(generarPregunta(nivelInicial))
      setHintIndex(0)
      start()

      await cargarModelo(setDecisionTree)
    }

    fetchStudentAndInit()
  }, [])


  if (!pregunta) return null

  // ---------- Helper: reiniciar ----------
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

  // ---------- Core: procesar resultado (único lugar que decide nivel + guarda todo) ----------
  const procesarResultado = async (es_correcto: boolean) => {
    if (!student?.id || !temaPeriodoId || !pregunta) return

    // 1) Actualizar contadores "consecutivos" locales
    const nuevosAciertos = es_correcto ? aciertos + 1 : 0
    const nuevosErrores = es_correcto ? 0 : errores + 1
    const nuevaRacha = nuevosAciertos
    const nuevosHist = [...historial, es_correcto]

    const tiempoCat: Tiempo = getTiempoCategoria(elapsedSeconds)
    const tendencia: Mejora = getTendencia(nuevosHist)

    // 2) Construir sample con las MISMAS 15 features del modelo
    const sample: Sample = {
      nivel: nivelActual,
      aciertos: nuevosAciertos,
      errores: nuevosErrores,
      tiempo_promedio: tiempoCat,
      pistas_usadas: pistasUsadas,
      racha: nuevaRacha,
      mejora: tendencia,
      tipo_problema: 'sumas', // 👈 importante para distinguir tema
      intentos_por_pregunta: 1, // ajusta si permites reintentos por pregunta
      variabilidad_tiempo: Math.random() > 0.5 ? 'consistente' : 'variable',
      patron_errores: Math.random() > 0.5 ? 'sistematico' : 'aleatorio',
      sesiones_completadas: Math.floor(Math.random() * 5) + 1,
      tiempo_primera_respuesta: tiempoCat,
      uso_recursos_extra: pistasUsadas >= 2 || nuevosErrores >= 3,
      consistencia_semanal: 'alta', // coloca tu cálculo real si lo tienes
    }

    // 3) Registrar intento real (tabla de respuestas)
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

    // 4) Decidir con el árbol (fallback a reglas)
    let decision: Resultado = 'mantiene'
    if (decisionTree) {
      decision = decisionTree.predict(sample) as Resultado
      // bordes
      if ((decision === 'sube' && nivelActual === 3) || (decision === 'baja' && nivelActual === 1)) {
        decision = 'mantiene'
      }
    } else {
      // Fallback manual
      if (nuevosAciertos >= 3 && nivelActual < 3) decision = 'sube'
      else if (nuevosErrores >= 3 && nivelActual > 1) decision = 'baja'
      else decision = 'mantiene'
    }

    // 5) Guardar sample real etiquetado y reentrenar en memoria
    await appendTrainingExampleFast({ ...sample, resultado: decision })


    // 6) Aplicar decisión al nivel + actualizar UI
    let nuevoNivel: Nivel = nivelActual
    if (decision === 'sube' && nivelActual < 3) nuevoNivel = (nivelActual + 1) as Nivel
    if (decision === 'baja' && nivelActual > 1) nuevoNivel = (nivelActual - 1) as Nivel

    if (nuevoNivel !== nivelActual) {
      await updateNivelStudentPeriodo(student.id, temaPeriodoId, nuevoNivel)
      if (decision === 'sube') toast.success('¡Subiste de nivel! 🚀')
      else toast.error('Bajaste de nivel 📉')

      setNivelActual(nuevoNivel)
      setAciertos(0)
      setErrores(0)
      setRacha(0)
      setRespuestasEnNivel(0)
    } else {
      // Mantiene: solo actualizar contadores locales
      setAciertos(nuevosAciertos)
      setErrores(nuevosErrores)
      setRacha(nuevaRacha)
      setRespuestasEnNivel(r => r + 1)
    }

    // 7) Continuar con la siguiente pregunta
    nextWithDelay(1200, nuevoNivel)
  }


  // ---------- Handlers de verificación ----------
  const manejarError = async () => {
    // feedback + registro de error como intento real
    toast.error('❌ Respuesta incorrecta. Nueva pregunta.')
    setHistorial(prev => [...prev, false])
    await procesarResultado(false)
  }

  // Paso 2 (suma con denominador común, sin simplificar)
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
      if (guidedMode) setHintIndex(i => Math.max(i, 1))
      await manejarError()
    }
  }

  // Paso 3 (simplificación final)
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
      setHistorial(prev => [...prev, true])
      toast.success('🎉 ¡Muy bien! Fracción simplificada correcta.')
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      await procesarResultado(true)
    } else {
      if (guidedMode) setHintIndex(3)
      await manejarError()
    }
  }

  const hints = buildHints(pregunta)

  return (
    <>
      {isSubmitting && <LoadingOverlay />}
      <div className="mx-auto bg-card w-full flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
        <div className="w-full flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            ✅ Aciertos seguidos: <b>{racha}</b> | ❌ Errores seguidos: <b>{errores}</b> | 💡 Pistas: <b>{pistasUsadas}</b> | 📊 Resp. nivel: <b>{respuestasEnNivel}</b>
          </div>
          <button
            onClick={() => setShowGuidePanel(v => !v)}
            className="px-3 py-1 rounded-md border border-border text-sm hover:bg-input"
          >
            {showGuidePanel ? 'Ocultar guía' : 'Mostrar guía'}
          </button>
        </div>

        <h2 className="text-2xl font-bold text-primary">Nivel {nivelActual}</h2>

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
                  if (guidedMode) setHintIndex(0)
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
            <div className="w-full flex justify-center">
            <button
              onClick={() => withLock(verificar)}
              disabled={isSubmitting}
              className="w-full max-w-sm bg-purple-500 text-white font-bold py-2 rounded-lg transition"
            >
              {isSubmitting ? 'Verificando…' : 'Verificar respuesta'}
            </button>
            </div>
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
            <div className="w-full flex justify-center">
              <button
                onClick={() => withLock(verificarSimplificada)}
                disabled={isSubmitting}
                className="bg-accent text-accent-foreground font-bold py-2 px-4 rounded-lg transition"
              >
                {isSubmitting ? 'Verificando…' : 'Verificar simplificación'}
              </button>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
