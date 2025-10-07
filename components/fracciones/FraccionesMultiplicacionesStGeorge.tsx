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
  tipo_problema: 'fracciones' | 'sumas' // Asegúrate de que esté definido correctamente
  intentos_por_pregunta: number
  variabilidad_tiempo: 'consistente' | 'variable'
  patron_errores: 'sistematico' | 'aleatorio'
  sesiones_completadas: number
  tiempo_primera_respuesta: Tiempo
  uso_recursos_extra: boolean
  consistencia_semanal: 'alta' | 'media' | 'baja'
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
  'intentos_por_pregunta',
  'variabilidad_tiempo',
  'patron_errores',
  'sesiones_completadas',
  'tiempo_primera_respuesta',
  'uso_recursos_extra',
  'consistencia_semanal'
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

  // ---------- Generación de pregunta (avanzada y variable) ----------
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
const mcm = (a: number, b: number): number => Math.abs((a * b) / gcd(a, b))
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const generarPregunta = (nivel: Nivel): Pregunta => {
  let denominador1 = 0
  let denominador2 = 0
  let a = 0
  let b = 0

  const sumWithLcm = (A: number, B: number, d1: number, d2: number) => {
    const L = mcm(d1, d2)
    return A * (L / d1) + B * (L / d2)
  }

  if (nivel === 1) {
    // Nivel 1: fracciones simples, homogéneas o múltiplos pequeños
    const tipo = Math.random()

    if (tipo < 0.6) {
      denominador1 = randInt(2, 9)
      denominador2 = denominador1 // mismos denominadores
    } else {
      denominador1 = randInt(2, 6)
      denominador2 = denominador1 * (Math.random() < 0.5 ? 2 : 3)
      if (denominador2 > 12) denominador2 = denominador1 * 2
    }

    a = randInt(1, Math.floor(denominador1 * 0.5))
    b = randInt(1, Math.floor(denominador2 * 0.5))

    // 60% <1, 30% ≈1, 10% >1
    const L = mcm(denominador1, denominador2)
    let total = sumWithLcm(a, b, denominador1, denominador2)
    if (total >= L && Math.random() < 0.6) {
      while (total >= L) {
        a = randInt(1, denominador1 - 1)
        b = randInt(1, denominador2 - 1)
        total = sumWithLcm(a, b, denominador1, denominador2)
      }
    }
  } 
  
  else if (nivel === 2) {
    // Nivel 2: denominadores medianos (6–14), diferentes, con o sin múltiplos
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

    // Numeradores medianos
    a = randInt(1, denominador1)
    b = randInt(1, denominador2)

    // 50% de las veces, fracción impropia
    if (Math.random() < 0.5) {
      a = randInt(Math.ceil(denominador1 * 0.6), denominador1)
      b = randInt(Math.ceil(denominador2 * 0.6), denominador2)
    }
  } 
  
  else {
    // Nivel 3: denominadores grandes (10–25), mezcla de coprimos e impropias
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

    // Numeradores altos (50%–120%)
    a = randInt(Math.ceil(denominador1 * 0.5), Math.ceil(denominador1 * 1.2))
    b = randInt(Math.ceil(denominador2 * 0.5), Math.ceil(denominador2 * 1.2))

    // Ajustar proporciones para evitar explosiones visuales
    if (a / denominador1 > 1.5) a = denominador1
    if (b / denominador2 > 1.5) b = denominador2
  }

  // Contextos variados y gamificados 🎯
  const contextos = [
    `🍰 María tiene ${a}/${denominador1} de una torta y comparte ${b}/${denominador2} de su parte. ¿Qué fracción entregó?`,
    `⚽ Martín entrena ${a}/${denominador1} del tiempo planeado y luego ${b}/${denominador2} más. ¿Qué fracción cumplió?`,
    `🎨 Ana pintó ${a}/${denominador1} del mural y después ${b}/${denominador2} más. ¿Cuánto pintó en total?`,
    `📘 Carlos leyó ${a}/${denominador1} de su libro y ${b}/${denominador2} del siguiente. ¿Qué parte ha leído en total?`,
    `🧩 Lucía armó ${a}/${denominador1} de un rompecabezas y ${b}/${denominador2} de otro. ¿Qué fracción completó?`,
    `🧃 Pedro bebió ${a}/${denominador1} del jugo y ${b}/${denominador2} más. ¿Qué parte bebió del total?`,
  ]

  return {
    a,
    b,
    operador: '×', // multiplicación
    denominador1,
    denominador2,
    contexto: contextos[Math.floor(Math.random() * contextos.length)],
  }

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

// Función para generar datos más realistas


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


// ======================
// Confusion Matrix + Metrics
// ======================
function confusionMatrixMulticlase(testData: TrainingRow[], dt: any) {
  const labels: Resultado[] = ['sube', 'mantiene', 'baja'];
  const matrix: Record<Resultado, Record<Resultado, number>> = {
    sube: { sube: 0, mantiene: 0, baja: 0 },
    mantiene: { sube: 0, mantiene: 0, baja: 0 },
    baja: { sube: 0, mantiene: 0, baja: 0 },
  };

  for (const row of testData) {
    const real = row.resultado;
    const pred = dt.predict(row) as Resultado;
    matrix[real][pred] += 1;
  }

  return matrix;
}

function calcularMetricasMulticlase(matrix: Record<Resultado, Record<Resultado, number>>) {
  const labels: Resultado[] = ['sube', 'mantiene', 'baja'];
  
  let totalCorrect = 0;
  let totalSamples = 0;
  
  const metrics: Record<Resultado, { precision: number; recall: number; f1: number }> = {
    sube: { precision: 0, recall: 0, f1: 0 },
    mantiene: { precision: 0, recall: 0, f1: 0 },
    baja: { precision: 0, recall: 0, f1: 0 },
  };

  // Calcular total de muestras y aciertos
  labels.forEach(label => {
    labels.forEach(predLabel => {
      const count = matrix[label][predLabel];
      totalSamples += count;
      if (label === predLabel) {
        totalCorrect += count;
      }
    });
  });

  // Calcular métricas por clase
  labels.forEach(label => {
    const TP = matrix[label][label];
    
    // False Positives: suma de la columna (predicciones de esta clase) menos TP
    const FP = labels.reduce((sum, realLabel) => 
      sum + (realLabel !== label ? matrix[realLabel][label] : 0), 0
    );
    
    // False Negatives: suma de la fila (casos reales de esta clase) menos TP
    const FN = labels.reduce((sum, predLabel) => 
      sum + (predLabel !== label ? matrix[label][predLabel] : 0), 0
    );

    // Calcular métricas con protección contra división por cero
    const precision = (TP + FP) > 0 ? TP / (TP + FP) : 0;
    const recall = (TP + FN) > 0 ? TP / (TP + FN) : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    metrics[label] = { precision, recall, f1 };
  });

  // Accuracy global
  const accuracy = totalSamples > 0 ? totalCorrect / totalSamples : 0;

  return { accuracy, metrics, totalSamples, totalCorrect };
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
 
  const initRef = useRef(false)
  const [respuestasEnNivel, setRespuestasEnNivel] = useState(0)
  const [student, setStudent] = useState<any>(null)

useEffect(() => {
  const supabase = createClient()

  const syncStudentFromAuth = async () => {
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) return

  // Guardamos el user en estado (por si lo necesitas después)
  setStudent(user)

  // 🔥 Buscar el registro del estudiante vinculado al auth.user.id
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', user.id) // <-- cambio clave aquí
    .maybeSingle()

  if (studentError) {
    console.error('❌ Error obteniendo student:', studentError)
    return
  }

  if (studentData) {
    setStudent(studentData)
    console.log('✅ Student sincronizado desde Supabase Auth:', studentData)
  } else {
    console.warn('⚠️ No se encontró registro en students para este user.id')
  }
}


  syncStudentFromAuth()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setStudent(session.user)
      syncStudentFromAuth()
    } else {
      setStudent(null)
    }
  })

  return () => subscription.unsubscribe()
}, [])
useEffect(() => {
  if (!student?.id) return
  if (initRef.current) return
  initRef.current = true

  ;(async () => {
    try {
      // 🔹 Obtener nivel actual del alumno
      const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
      const nivelInicial = (nivelBD ?? 1) as Nivel
      setNivelActual(nivelInicial)

      // 🔹 Cargar modelo del árbol
      await cargarModelo(setDecisionTree)

      // 🔹 Generar la primera pregunta
      const q = generarPregunta(nivelInicial)
      setPregunta(q)

      // 🔹 Iniciar el temporizador
      reset()
      start()

      console.log('✅ Juego inicializado | Nivel:', nivelInicial)
    } catch (err) {
      console.error('❌ Error al inicializar el juego:', err)
    }
  })()
}, [student])




  // Añadir ejemplos al modelo en la base de datos
// Añadir ejemplos al modelo en la base de datos
async function appendTrainingExampleFast(example: any) {
  try {
    const { error } = await supabase
      .from('decision_training_samples')
      .insert([
        {
          tema_periodo_id: temaPeriodoId,
          sample: example,
        },
      ])
    if (error) throw error
    console.log('✅ Ejemplo guardado en decision_training_samples')
  } catch (err) {
    console.error('❌ Error al guardar ejemplo de entrenamiento:', err)
  }
}




  // Función para simular 5000 estudiantes

  if (!pregunta) return null

const registrarRespuesta = async (es_correcto: boolean) => {
  if (!student?.id || !temaPeriodoId || !pregunta) return

  const tiempoCat: Tiempo = getTiempoCategoria(elapsedSeconds)
  const nuevosAciertos = es_correcto ? aciertos + 1 : aciertos
  const nuevosErrores = es_correcto ? errores : errores + 1

  const { nuevoNivel, decision, sample } = decidirNivel(
    nuevosAciertos,
    nuevosErrores,
    es_correcto
  )

  // Guardar sample real
  await appendTrainingExampleFast({ ...sample, resultado: decision })


  // Actualizar nivel en BD y estado
  if (decision === 'sube' && nivelActual < 3) {
    await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
    setNivelActual(nuevoNivel)
    toast.success('¡Subiste de nivel! 🚀', { icon: '🚀' })
    setAciertos(0)
    setErrores(0)
    setRacha(0)
    setRespuestasEnNivel(0)
  } else if (decision === 'baja' && nivelActual > 1) {
    await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
    setNivelActual(nuevoNivel)
    toast.error('Bajaste de nivel 📉', { icon: '📉' })
    setAciertos(0)
    setErrores(0)
    setRacha(0)
    setRespuestasEnNivel(0)
  } else {
    // Mantiene
    setAciertos(nuevosAciertos)
    setErrores(nuevosErrores)
    setRacha(es_correcto ? racha + 1 : 0)
    setRespuestasEnNivel(r => r + 1)
  }

  nextWithDelay(1200, nuevoNivel)
}



const manejarError = async () => {
  toast.error('❌ Respuesta incorrecta. Nueva pregunta.')
  setRacha(0)
  setHistorial((h) => [...h, false])
  if (guidedMode) setHintIndex((i) => Math.min(i + 1, 2))

  // ✅ No sumes errores aquí, delega todo a registrarRespuesta
  await registrarRespuesta(false)
}


const decidirNivel = (
  nuevoAciertos: number,
  nuevosErrores: number,
  es_correcto: boolean
): { nuevoNivel: Nivel; decision: Resultado; sample: Sample } => {
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
    intentos_por_pregunta: 1,
    variabilidad_tiempo: Math.random() > 0.5 ? 'consistente' : 'variable',
    patron_errores: Math.random() > 0.5 ? 'sistematico' : 'aleatorio',
    sesiones_completadas: Math.floor(Math.random() * 5) + 1,
    tiempo_primera_respuesta: tiempoCat,
    uso_recursos_extra: pistasUsadas >= 2 || nuevosErrores >= 3,
    consistencia_semanal: 'alta',
  }

  if (decisionTree) {
    decision = decisionTree.predict(sample) as Resultado

    // Ajustes de borde
    if (decision === 'sube' && nivelActual === 3) decision = 'mantiene'
    if (decision === 'baja' && nivelActual === 1) decision = 'mantiene'

    if (decision === 'sube' && nivelActual < 3) {
      nuevoNivel = (nivelActual + 1) as Nivel
    } else if (decision === 'baja' && nivelActual > 1) {
      nuevoNivel = (nivelActual - 1) as Nivel
    }
  } else {
    // Fallback manual
    if (nuevoAciertos >= 3 && nivelActual < 3) {
      decision = 'sube'
      nuevoNivel = (nivelActual + 1) as Nivel
    } else if (nuevosErrores >= 3 && nivelActual > 1) {
      decision = 'baja'
      nuevoNivel = (nivelActual - 1) as Nivel
    } else {
      decision = 'mantiene'
    }
  }

  console.log('[DT] 🔮 Decisión:', decision, '| Nivel nuevo:', nuevoNivel, '| Sample=', sample)
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



  const verificar = async () => {
  const { a, b, denominador1, denominador2 } = pregunta!
  const esperadoNum = a * b
  const esperadoDen = denominador1 * denominador2

  const userNum = parseInt(respuestaFinal.numerador)
  const userDen = parseInt(respuestaFinal.denominador)

  const numCorrecto = userNum === esperadoNum
  const denCorrecto = userDen === esperadoDen

  if (numCorrecto && denCorrecto) {
    // ✅ Solo registrar la respuesta correcta
    setAciertos(aciertos + 1)
    setErrores(0)
    setRacha(r => r + 1)
    setHistorial(h => [...h, true])

    toast.success('🎉 ¡Correcto!')
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })

    await registrarRespuesta(true)  // 🔥 Aquí se hará todo (árbol + nivel + siguiente)
  } else {
    toast.error('Multiplica numeradores y denominadores correctamente.')
    if (guidedMode) setHintIndex(i => Math.min(i + 1, 2))

    await manejarError() // 🔥 Esto ya llama a registrarRespuesta(false)
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
