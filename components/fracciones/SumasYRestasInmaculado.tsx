'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'

const supabase = createClient()

/**
 * Juego: Sumas y Restas (sin llevar / sin prestar) hasta la decena
 * Niveles:
 *  - Nivel 1: números de 0 a 10 (1 cifra)
 *  - Nivel 2: números de 10 a 20 (dos cifras) sin llevar/prestar
 *  - Nivel 3: números de 10 a 99 (dos cifras) sin llevar/prestar
 * Reglas de subida/bajada: +1 nivel tras 3 aciertos seguidos; -1 nivel tras 3 errores acumulados.
 */

type Nivel = 1 | 2 | 3

type Operador = '+' | '-'

interface Pregunta {
  a: number
  b: number
  operador: Operador
  contexto: string
}

// Usa tu propio ID real del tema/periodo en Supabase
const temaPeriodoId = '37d918d2-7ab9-4b9b-b1c2-eb2712568135'

// ---------- Loading Overlay ----------
const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      <p className="text-white font-semibold">Procesando…</p>
    </div>
  </div>
)

// ---------- Utilidades ----------
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

/** Genera una suma sin llevar por columna */
function generarSumaSinLlevar(min: number, max: number): { a: number; b: number } {
  // intentos defensivos para cumplir restricciones
  for (let i = 0; i < 200; i++) {
    const a = rand(min, max)
    const b = rand(min, max)
    // Limitar a dos cifras máximo (ya está por rango) y que no exceda 99
    if (a + b > 99) continue

    // condición sin llevar por columnas si son 2 cifras
    const aU = a % 10
    const bU = b % 10
    const aT = Math.floor(a / 10)
    const bT = Math.floor(b / 10)

    if (aU + bU >= 10) continue // llevar en unidades
    if (a >= 10 || b >= 10) {
      if (aT + bT >= 10) continue // llevar en decenas
    }
    return { a, b }
  }
  // Fallback seguro
  return { a: 4, b: 3 }
}

/** Genera una resta sin pedir/prestar por columna */
function generarRestaSinPrestar(min: number, max: number): { a: number; b: number } {
  for (let i = 0; i < 200; i++) {
    let a = rand(min, max)
    let b = rand(min, max)

    // Queremos a >= b
    if (a < b) [a, b] = [b, a]

    const aU = a % 10
    const bU = b % 10
    const aT = Math.floor(a / 10)
    const bT = Math.floor(b / 10)

    // Sin pedir/prestar: unidades y decenas del minuendo >= sustraendo
    if (aU < bU) continue
    if (a >= 10 || b >= 10) {
      if (aT < bT) continue
    }

    return { a, b }
  }
  // Fallback seguro
  return { a: 8, b: 5 }
}

function generarContexto(a: number, b: number, op: Operador) {
  const sujetos = ['María', 'Pedro', 'Ana', 'Lucho', 'Karla', 'Diego']
  const objetos = ['manzanas', 'pelotas', 'lápices', 'caramelos', 'figuritas', 'bloques']
  const s = sujetos[rand(0, sujetos.length - 1)]
  const o = objetos[rand(0, objetos.length - 1)]

  if (op === '+') {
    return `${s} tiene ${a} ${o} y recibe ${b} más. ¿Cuántas ${o} tiene ahora en total?`
  } else {
    return `${s} tiene ${a} ${o} y regala ${b}. ¿Cuántas ${o} le quedan?`
  }
}

function generarPregunta(nivel: Nivel): Pregunta {
  // Rango por nivel
  let min = 0
  let max = 10
  if (nivel === 2) {
    min = 10
    max = 20
  } else if (nivel === 3) {
    min = 10
    max = 99
  }

  // Elegir operación (más sumas que restas para 1er grado)
  const op: Operador = Math.random() < 0.6 ? '+' : '-'

  let a = 0,
    b = 0
  if (op === '+') {
    ;({ a, b } = generarSumaSinLlevar(min, max))
  } else {
    ;({ a, b } = generarRestaSinPrestar(min, max))
  }

  return {
    a,
    b,
    operador: op,
    contexto: generarContexto(a, b, op),
  }
}

// ---------- Componente visual de número grande ----------
function BigNumber({ value, accent = false }: { value: number | string; accent?: boolean }) {
  return (
    <div className={`px-4 py-2 rounded-xl border border-border bg-popover text-center`}> 
      <span className={`text-5xl font-extrabold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}

// ---------- Hints ----------
const buildHints = (p: Pregunta) => {
  if (p.operador === '+') {
    return [
      {
        title: 'Pista 1 — Suma por columnas',
        text: 'Primero suma las unidades (sin pasar de 9). Luego suma las decenas. No llevamos en este juego.',
      },
      {
        title: 'Pista 2 — Unidades',
        text: `Unidades: ${p.a % 10} + ${p.b % 10}.`,
      },
      {
        title: 'Pista 3 — Decenas',
        text: `Decenas: ${Math.floor(p.a / 10)} + ${Math.floor(p.b / 10)}.`,
      },
    ]
  }
  return [
    {
      title: 'Pista 1 — Resta por columnas',
      text: 'Primero resta las unidades (sin pedir). Luego resta las decenas. No prestamos en este juego.',
    },
    {
      title: 'Pista 2 — Unidades',
      text: `Unidades: ${p.a % 10} - ${p.b % 10}.`,
    },
    {
      title: 'Pista 3 — Decenas',
      text: `Decenas: ${Math.floor(p.a / 10)} - ${Math.floor(p.b / 10)}.`,
    },
  ]
}

export default function SumasRestasPrimeroGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)

  const [respuesta, setRespuesta] = useState<string>('')
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const withLock = async (fn: () => Promise<void>) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await fn()
    } finally {
      setIsSubmitting(false)
    }
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
  const answerRef = useRef<HTMLInputElement>(null)
  const { student } = useStudent()

  useEffect(() => {
    const cargarNivel = async () => {
      if (student?.id) {
        const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
        const nivelInicial = (nivelBD ?? 1) as Nivel
        setNivelActual(nivelInicial)
        const q = generarPregunta(nivelInicial)
        setPregunta(q)
        setHintIndex(0)
        start()
      }
    }
    cargarNivel()
  }, [student])

  if (!pregunta) return null

  const registrarRespuesta = async (es_correcto: boolean, respuestaNum: number) => {
    if (!student?.id || !temaPeriodoId || !pregunta) return
    await insertStudentResponse({
      student_id: student.id,
      tema_periodo_id: temaPeriodoId,
      nivel: nivelActual,
      es_correcto,
      ejercicio_data: {
        a: pregunta.a,
        b: pregunta.b,
        operador: pregunta.operador,
        contexto: pregunta.contexto,
      },
      respuesta: {
        numerador: respuestaNum, // Reutilizamos el schema (num=respuesta)
        denominador: 1,
      },
      tiempo_segundos: elapsedSeconds,
    })
  }

  const reiniciarEjercicio = (nuevoNivel: Nivel) => {
    const q = generarPregunta(nuevoNivel)
    setPregunta(q)
    setRespuesta('')
    setFallosEjercicioActual(0)
    setHintIndex(0)
    reset()
    start()
    answerRef.current?.focus()
  }

  const manejarError = async (respuestaNum: number) => {
    const nuevosFallos = fallosEjercicioActual + 1
    setFallosEjercicioActual(nuevosFallos)

    if (nuevosFallos >= 2) {
      await registrarRespuesta(false, respuestaNum)
      setErrores((prev) => prev + 1)
      setAciertos(0)

      let nuevoNivel = nivelActual
      if (errores + 1 >= 3 && nivelActual > 1) {
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('Bajaste de nivel para reforzar la base 📉', { icon: '📉' })
        setErrores(0)
      }
      nextWithDelay(1000, nuevoNivel)
    }
  }

  const verificar = async () => {
    if (!pregunta) return
    const userAns = parseInt(respuesta)
    if (Number.isNaN(userAns)) {
      toast.error('Escribe tu respuesta.')
      return
    }

    const esperado = pregunta.operador === '+' ? pregunta.a + pregunta.b : pregunta.a - pregunta.b

    if (userAns === esperado) {
      await registrarRespuesta(true, userAns)
      setAciertos((prev) => prev + 1)
      setErrores(0)
      toast.success('🎉 ¡Correcto!')
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })

      let nuevoNivel = nivelActual
      if (aciertos + 1 >= 3 && nivelActual < 3) {
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('¡Subiste de nivel! 🚀', { icon: '🚀' })
        setAciertos(0)
        setErrores(0)
      }
      nextWithDelay(900, nuevoNivel)
    } else {
      const tip = pregunta.operador === '+' ? 'Suma unidades y luego decenas (sin llevar).'
        : 'Resta unidades y luego decenas (sin prestar).'
      toast.error(`Casi… ${tip}`)
      if (guidedMode) setHintIndex((i) => Math.min(i + 1, 2))
      await manejarError(userAns)
    }
  }

  const hints = buildHints(pregunta)

  const coachMsg = (() => {
    if (fallosEjercicioActual === 0) return 'Piensa en unidades y decenas. ¡Tú puedes!'
    if (fallosEjercicioActual === 1) return 'Revisa primero las unidades y luego las decenas.'
    if (fallosEjercicioActual >= 2) return 'Usa la pista y vuelve a intentarlo con calma.'
    return '¡Vamos!'
  })()

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
                <h3 className="font-semibold mb-2 text-foreground">Cómo resolvemos (sin llevar / sin prestar)</h3>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground">
                  <li>Trabaja primero <b>las unidades</b>.</li>
                  <li>Luego resuelve <b>las decenas</b>.</li>
                  <li>En este juego <b>no llevamos ni prestamos</b>.</li>
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

        {/* Contexto del problema */}
        <p className="text-lg text-center text-foreground">{pregunta.contexto}</p>

        {/* Visualización grande */}
        <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-muted-foreground">Primer número</span>
            <BigNumber value={pregunta.a} accent />
          </div>

          <div className="flex items-center justify-center">
            <span className="text-5xl font-bold text-foreground">{pregunta.operador}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-muted-foreground">Segundo número</span>
            <BigNumber value={pregunta.b} accent />
          </div>

          <div className="flex items-center justify-center">
            <span className="text-5xl font-bold text-foreground">=</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-muted-foreground">Tu respuesta</span>
            <input
              ref={answerRef}
              type="number"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="?"
              className="w-32 text-center p-3 text-3xl bg-white text-foreground border border-border rounded"
            />
          </div>
        </div>

        <div className="w-full max-w-sm flex gap-2">
          <button
            onClick={() => withLock(verificar)}
            disabled={isSubmitting}
            className="flex-1 bg-primary hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground font-bold py-2 rounded-lg transition"
          >
            {isSubmitting ? 'Verificando…' : 'Verificar respuesta'}
          </button>

          {guidedMode && (
            <button
              onClick={() => setHintIndex((i) => Math.min(i + 1, 2))}
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
