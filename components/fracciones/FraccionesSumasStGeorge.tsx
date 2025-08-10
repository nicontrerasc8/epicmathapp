'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import FractionCanvas from './FractionCanvas'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import toast from 'react-hot-toast'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'

const supabase = createClient()

type Nivel = 1 | 2 | 3

interface Pregunta {
  a: number
  b: number
  operador: string
  denominador1: number
  denominador2: number
  contexto: string
}

const temaPeriodoId = 'ea5de085-2e52-40ac-b975-8931d08b9e44'

// ---------- Utilidades matemáticas ----------
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
const mcm = (a: number, b: number): number => Math.abs((a * b) / gcd(a, b))
const simplificarFraccion = (numerador: number, denominador: number) => {
  const d = gcd(numerador, denominador)
  return { numerador: numerador / d, denominador: denominador / d }
}



const lcmBound = (a: number, b: number) => Math.abs((a * b) / gcd(a, b))

/**
 * Reglas por nivel:
 *  Nivel 1 (fácil):  d1,d2 ∈ [2..12], SIEMPRE comparten factor y
 *                    casi siempre uno divide al otro. LCM ≤ 24.
 *  Nivel 2 (medio):  d1,d2 ∈ [3..15], LCM ≤ 60, pueden ser coprimos.
 *  Nivel 3 (alto):   d1,d2 ∈ [7..24], LCM ≤ 120, preferencia por coprimos.
 */
const pickDenominators = (nivel: Nivel): { d1: number; d2: number } => {
  let d1 = 0, d2 = 0

  if (nivel === 1) {
    // Pares tipo (2,4), (3,6), (4,8), (5,10), (6,12) o con gcd>1 y MCM pequeño
    const bases = [2, 3, 4, 5, 6]
    for (; ;) {
      const base = bases[Math.floor(Math.random() * bases.length)]
      const multiples = [2, 3].map(k => base * k).filter(v => v <= 12)
      const candidate = multiples.length ? multiples[Math.floor(Math.random() * multiples.length)] : base * 2
      d1 = base
      d2 = candidate
      if (d1 !== d2 && gcd(d1, d2) > 1 && lcmBound(d1, d2) <= 24) break
    }
  }

  if (nivel === 2) {
    // Mezcla: a veces comparten factor, a veces son coprimos; LCM moderado
    for (; ;) {
      d1 = randInt(3, 15)
      do { d2 = randInt(3, 15) } while (d2 === d1)
      const l = lcmBound(d1, d2)
      if (l <= 60) break
    }
  }

  if (nivel === 3) {
    // Un poco más grandes; preferencia por coprimos; LCM más alto pero acotado
    for (; ;) {
      d1 = randInt(7, 24)
      do { d2 = randInt(7, 24) } while (d2 === d1)
      const l = lcmBound(d1, d2)
      const g = gcd(d1, d2)
      // 70% coprimos para hacerlo más retador
      const wantCoprime = Math.random() < 0.7
      if (l <= 120 && (!wantCoprime || g === 1)) break
    }
  }

  return { d1, d2 }
}

const generarPregunta = (nivel: Nivel): Pregunta => {
  const { d1: denominador1, d2: denominador2 } = pickDenominators(nivel)

  // Fracciones propias para que el dibujo sea intuitivo
  const a = randInt(1, denominador1 - 1)
  const b = randInt(1, denominador2 - 1)

  const contextos = [
    `María tiene ${a}/${denominador1} de una torta y recibe ${b}/${denominador2} más. ¿Cuánto tiene ahora?`,
    `Pedro comió ${a}/${denominador1} de una pizza y luego ${b}/${denominador2} más. ¿Cuánto comió en total?`,
    `Ana coloreó ${a}/${denominador1} de un dibujo y después ${b}/${denominador2} más. ¿Cuánto coloreó en total?`,
    `Carlos lee ${a}/${denominador1} de un libro y luego ${b}/${denominador2} más. ¿Cuánto ha leído en total?`,
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

// ---------- Motor de pistas guiadas ----------
const buildHints = (p: Pregunta) => {
  const denComun = mcm(p.denominador1, p.denominador2)
  const nuevoA = p.a * (denComun / p.denominador1)
  const nuevoB = p.b * (denComun / p.denominador2)
  const suma = nuevoA + nuevoB
  const simple = simplificarFraccion(suma, denComun)
  return [
    {
      title: 'Pista 1 — Denominador común',
      text: `Busca el mínimo común múltiplo (MCM) entre ${p.denominador1} y ${p.denominador2}.`
    },
    {
      title: 'Pista 2 — Equivalentes',
      text: `Convierte ${p.a}/${p.denominador1} a denominador ${denComun} y ${p.b}/${p.denominador2} a denominador ${denComun}.`
    },
    {
      title: 'Pista 3 — Suma',
      text: `Suma los numeradores ya convertidos: ${nuevoA} + ${nuevoB}. Mantén el denominador ${denComun}.`
    },
    {
      title: 'Pista 4 — Simplificar',
      text: `Si se puede, divide numerador y denominador por su máximo común divisor. Resultado esperado en forma simplificada: ${simple.numerador}/${simple.denominador}.`
    },
  ]
}

// ---------- Ejemplo SIEMPRE distinto al ejercicio ----------
const samePair = (a: number, b: number, c: number, d: number) =>
  (a === c && b === d) || (a === d && b === c)

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const pickExampleDenominators = (nivel: Nivel, d1Real: number, d2Real: number) => {
  let d1 = 0, d2 = 0, intentos = 0
  while (true) {
    intentos++
    if (nivel === 1) {
      // pares fáciles (uno divide al otro) y MCM pequeño
      const base = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)]
      const mult = [2, 3][Math.floor(Math.random() * 2)]
      d1 = base
      d2 = base * mult
      if (d2 > 12) continue
      if (lcmBound(d1, d2) > 24) continue
    } else if (nivel === 2) {
      // LCM moderado
      d1 = randInt(3, 15)
      do { d2 = randInt(3, 15) } while (d2 === d1)
      if (lcmBound(d1, d2) > 60) continue
    } else {
      // preferencia por coprimos y LCM acotado
      d1 = randInt(7, 24)
      do { d2 = randInt(7, 24) } while (d2 === d1)
      const wantCoprime = Math.random() < 0.7
      if (lcmBound(d1, d2) > 120) continue
      if (wantCoprime && gcd(d1, d2) !== 1) continue
    }
    if (!samePair(d1, d2, d1Real, d2Real)) break
    if (intentos > 50) break // “escape” por si acaso
  }
  return { d1, d2 }
}

const buildExample = (nivel: Nivel, p: Pregunta) => {
  const { d1, d2 } = pickExampleDenominators(nivel, p.denominador1, p.denominador2)

  // numeradores pequeños, propios y distintos a los del ejercicio
  let a = randInt(1, Math.max(2, Math.min(4, d1 - 1)))
  let b = randInt(1, Math.max(2, Math.min(4, d2 - 1)))
  if (a === p.a && d1 === p.denominador1) a = Math.min(a + 1, d1 - 1) || 1
  if (b === p.b && d2 === p.denominador2) b = Math.min(b + 1, d2 - 1) || 1

  const denComun = mcm(d1, d2)
  const nuevoA = a * (denComun / d1)
  const nuevoB = b * (denComun / d2)
  const suma = nuevoA + nuevoB
  const simple = simplificarFraccion(suma, denComun)

  return { d1, d2, a, b, denComun, nuevoA, nuevoB, suma, simple }
}


export function FraccionesSumasStGeorgeGameGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)

  const [respuestaFinal, setRespuestaFinal] = useState({ numerador: '', denominador: '' })
  const [respuestaSimplificada, setRespuestaSimplificada] = useState({ numerador: '', denominador: '' })

  const [mostrarInputSimplificado, setMostrarInputSimplificado] = useState(false)
  const [mcmUsuario, setMcmUsuario] = useState('')
  const [mostrarPasoMCM, setMostrarPasoMCM] = useState(true)

  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)

  // Guía y pistas
  const [guidedMode, setGuidedMode] = useState(true)
  const [hintIndex, setHintIndex] = useState(0)
  const [showGuidePanel, setShowGuidePanel] = useState(true)
  const [showExample, setShowExample] = useState(false)
  type Example = ReturnType<typeof buildExample>
const [example, setExample] = useState<any>(null)


  // “Profe” micro‑coach
  const coachMsg = (() => {
    if (fallosEjercicioActual === 0 && !mostrarPasoMCM) return '¡Va bien! Recuerda: primero equivalencias, luego suma, al final simplifica.'
    if (fallosEjercicioActual === 1) return 'Tranquilo, revisa si usaste bien el mínimo común múltiplo y si convertiste ambos numeradores.'
    if (fallosEjercicioActual >= 2) return 'Respira. Mira el ejemplo paso a paso y vuelve a intentarlo 👇'
    return '¡Tú puedes!'
  })()

  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const finalNumeradorRef = useRef<HTMLInputElement>(null)
  const finalDenominadorRef = useRef<HTMLInputElement>(null)
  const { student } = useStudent()
  const initRef = useRef(false)

useEffect(() => {
  if (!student?.id) return
  if (initRef.current) return    // evita doble ejecución en StrictMode (dev)
  initRef.current = true

  ;(async () => {
    const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
    const nivelInicial = (nivelBD ?? 1) as Nivel
    setNivelActual(nivelInicial)
    const q = generarPregunta(nivelInicial)
    setPregunta(q)
    setExample(buildExample(nivelInicial, q))   // <-- congela ejemplo
    setHintIndex(0)
    setShowExample(false)
    start()
  })()
}, [student])

  if (!pregunta) return null

  const registrarRespuestaFinal = async (es_correcto: boolean) => {
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
        denominador1: pregunta.denominador1,
        denominador2: pregunta.denominador2,
        contexto: pregunta.contexto,
      },
      respuesta: {
        numerador: parseInt(respuestaFinal.numerador),
        denominador: parseInt(respuestaFinal.denominador),
        simplificado: mostrarInputSimplificado,
      },
      tiempo_segundos: elapsedSeconds,
    })
  }

  // --------- Lógica de manejo de fallos y nivel ----------
const reiniciarEjercicio = (nuevoNivel: Nivel) => {
  const q = generarPregunta(nuevoNivel)
  setPregunta(q)
  setExample(buildExample(nuevoNivel, q))  // <-- congela ejemplo
  setRespuestaFinal({ numerador: '', denominador: '' })
  setRespuestaSimplificada({ numerador: '', denominador: '' })
  setMostrarInputSimplificado(false)
  setMostrarPasoMCM(true)
  setMcmUsuario('')
  setFallosEjercicioActual(0)
  setHintIndex(0)
  setShowExample(false)
  reset()
  start()
}

  const manejarError = async () => {
    const nuevosFallos = fallosEjercicioActual + 1
    setFallosEjercicioActual(nuevosFallos)

    if (nuevosFallos >= 2) {
      // Fallo definitivo (cambiar de ejercicio)
      await registrarRespuestaFinal(false)
      setErrores(prev => prev + 1)
      setAciertos(0)

      let nuevoNivel = nivelActual
      if (errores + 1 >= 3 && nivelActual > 1) {
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('Bajaste de nivel para repasar fundamentos 👇', { icon: '📉' })
        setErrores(0)
      }
      setTimeout(() => reiniciarEjercicio(nuevoNivel), 1400)
    }
  }

  // --------- Verificaciones con feedback específico ----------
  const verificar = async () => {
    const { a, b, denominador1, denominador2 } = pregunta
    const denComun = mcm(denominador1, denominador2)
    const nuevoA = a * (denComun / denominador1)
    const nuevoB = b * (denComun / denominador2)
    const esperadoNum = nuevoA + nuevoB
    const esperadoDen = denComun

    const userNum = parseInt(respuestaFinal.numerador)
    const userDen = parseInt(respuestaFinal.denominador)

    // Errores específicos para mejor retro
    const numCorrecto = userNum === esperadoNum
    const denCorrecto = userDen === esperadoDen

    if (numCorrecto && !denCorrecto) {
      toast.error('👀 El numerador está bien, pero el denominador no es el mínimo común múltiplo.')
      if (guidedMode) setHintIndex(i => Math.max(i, 1)) // empuja hacia pista de MCM/denominador
      return manejarError()
    }
    if (!numCorrecto && denCorrecto) {
      toast.error('🧮 El denominador está bien, revisa la conversión de numeradores.')
      if (guidedMode) setHintIndex(i => Math.max(i, 2))
      return manejarError()
    }

    if (numCorrecto && denCorrecto) {
      toast.success('Bien hecho. Ahora simplifica la fracción.')
      setMostrarInputSimplificado(true)
    } else {
      toast.error('Revisa mínimo común múltiplo, equivalencias y suma de numeradores.')
      if (guidedMode) setHintIndex(i => Math.min(i + 1, 3))
      manejarError()
    }
  }

  const verificarSimplificada = async () => {
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
      setAciertos(prev => prev + 1)
      setErrores(0)
      toast.success('🎉 ¡Muy bien! Fracción simplificada correcta.')
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })

      let nuevoNivel = nivelActual
      if (aciertos + 1 >= 3 && nivelActual < 3) {
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('¡Subiste de nivel! 🔼', { icon: '🚀' })
        setAciertos(0)
        setErrores(0)
      }
      setTimeout(() => reiniciarEjercicio(nuevoNivel), 1600)
    } else {
      toast.error('⚠️ Aún puedes simplificar mejor o revisa el máximo común divisor.')
      if (guidedMode) setHintIndex(3)
      manejarError()
    }
  }

  // ---------- UI de guía / pistas ----------
  const hints = buildHints(pregunta)
  //const example = buildExample(nivelActual, pregunta)

  return (
    <div className="mx-auto bg-card w-full flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
      {/* Barra superior */}
      <div className="w-full flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          ✅ Aciertos: <b>{aciertos}</b> &nbsp;|&nbsp; ❌ Errores: <b>{errores}</b>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={() => setShowGuidePanel(v => !v)}
            className="px-3 py-1 rounded-md border border-border text-sm hover:bg-input"
          >
            {showGuidePanel ? 'Ocultar guía' : 'Mostrar guía'}
          </button>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-primary">Nivel {nivelActual}</h2>

      {/* Panel de guía (mini-tutorial dentro del juego) */}
      <AnimatePresence initial={false}>
        {guidedMode && showGuidePanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full overflow-hidden"
          >
            <div className="rounded-lg border border-border p-4 bg-background">
              <h3 className="font-semibold mb-2 text-foreground">Cómo se resuelven sumas de fracciones con distinto denominador</h3>
              <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground">
                <li>Halla el <b>mínimo común múltiplo</b> de los denominadores.</li>
                <li>Convierte cada fracción a un <b>denominador común</b> usando el mínimo común múltiplo.</li>
                <li><b>Suma</b> los numeradores. Mantén el denominador común.</li>
                <li><b>Simplifica</b> la fracción dividiendo numerador y denominador por su <b>máximo común divisor</b>.</li>
              </ol>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setHintIndex(i => Math.min(i + 1, hints.length - 1))}
                  className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground font-medium hover:opacity-90"
                >
                  Pedir pista
                </button>
                <button
                  onClick={() => setShowExample(v => !v)}
                  className="px-3 py-2 rounded-md bg-accent text-accent-foreground font-medium hover:opacity-90"
                >
                  {showExample ? 'Ocultar ejemplo' : 'Ver ejemplo'}
                </button>
              </div>

              {/* Pista activa */}
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

              {/* Ejemplo con mismos denominadores (no revela directamente la respuesta del ejercicio actual) */}
              <AnimatePresence initial={false}>
                {showExample && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-3 text-sm rounded-md bg-input p-3"
                  >
         
                    <div className="font-medium mb-1">Ejemplo guiado (con otros números)</div>
                    <div className="space-y-1">
                      <div>1) MCM({example.d1}, {example.d2}) = <b>{example.denComun}</b></div>
                      <div>
                        2) Equivalencias: {example.a}/{example.d1} → <b>{example.nuevoA}/{example.denComun}</b>
                        &nbsp;y {example.b}/{example.d2} → <b>{example.nuevoB}/{example.denComun}</b>
                      </div>
                      <div>3) Suma de numeradores: {example.nuevoA} + {example.nuevoB} = <b>{example.suma}</b> (denominador {example.denComun})</div>
                      <div>4) Simplificación: <b>{example.suma}/{example.denComun}</b> → <b>{example.simple.numerador}/{example.simple.denominador}</b></div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Nota: Este es un ejemplo distinto a tu ejercicio actual.
                      </div>
                    </div>

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

      <p className="text-lg text-center text-foreground">{pregunta.contexto}</p>

      {/* Visualización de fracciones */}
      <div className="flex flex-row w-full justify-center items-center gap-8 flex-nowrap">
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted-foreground mb-2">Fracción 1</span>
          <FractionCanvas numerador={pregunta.a} denominador={pregunta.denominador1} />
        </div>
        <h2 className="text-5xl">+</h2>
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted-foreground mb-2">Fracción 2</span>
          <FractionCanvas numerador={pregunta.b} denominador={pregunta.denominador2} />
        </div>
      </div>

      {/* Paso 1: MCM */}
      {mostrarPasoMCM ? (
        <div className="w-full flex flex-col items-center space-y-2">
          <p className="text-center font-medium text-foreground">
            Paso 1: Calcula el <span className="font-bold text-primary">mínimo común múltiplo</span> entre {pregunta.denominador1} y {pregunta.denominador2}.
          </p>
          <input
            type="number"
            value={mcmUsuario}
            onChange={(e) => setMcmUsuario(e.target.value)}
            className="w-full max-w-xs text-center p-2 text-xl bg-white text-foreground border border-border rounded"
            placeholder="Mínimo común múltiplo"
          />
          <button
            onClick={() => {
              const esperado = mcm(pregunta.denominador1, pregunta.denominador2)
              if (parseInt(mcmUsuario) === esperado) {
                setMostrarPasoMCM(false)
                toast.success('Correcto. Ahora resuelve la suma.')
              } else {
                toast.error('Ese no es el MCM. Revisa múltiplos de ambos números.')
                if (guidedMode) setHintIndex(0)
                manejarError()
              }
            }}
            className="w-full max-w-xs bg-primary hover:brightness-110 text-primary-foreground font-bold py-2 rounded-lg transition"
          >
            Validar MCM
          </button>
        </div>
      ) : (
        <>
          {/* Paso 2: Suma con denominador común */}
          <p className="text-center font-medium text-foreground">
            Paso 2: Suma las fracciones usando el <span className="font-bold text-primary">denominador común</span>. No simplifiques aún.
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

          <div className="w-full max-w-sm flex gap-2">
            <button
              onClick={verificar}
              className="flex-1 bg-purple-500 hover:brightness-110 text-white font-bold py-2 rounded-lg transition"
            >
              Verificar respuesta
            </button>
            {guidedMode && (
              <button
                onClick={() => setHintIndex(i => Math.min(i + 1, 2))}
                className="px-3 py-2 rounded-lg border border-border hover:bg-input text-sm"
              >
                Una pista más
              </button>
            )}
          </div>
        </>
      )}

      {/* Paso 3: Simplificación */}
      {mostrarInputSimplificado && (
        <div className="w-full space-y-2">
          <p className="text-center font-medium text-foreground">
            Paso 3: Simplifica la fracción. Divide numerador y denominador entre su <b>máximo común divisor</b>.
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
          <div className="w-full max-w-sm flex gap-2">
            <button
              onClick={verificarSimplificada}
              className="flex-1 bg-accent hover:brightness-110 text-accent-foreground font-bold py-2 rounded-lg transition"
            >
              Verificar simplificación
            </button>
            {guidedMode && (
              <button
                onClick={() => setHintIndex(3)}
                className="px-3 py-2 rounded-lg border border-border hover:bg-input text-sm"
              >
                ¿Cómo simplifico?
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
