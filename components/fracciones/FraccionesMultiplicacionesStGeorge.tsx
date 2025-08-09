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

const temaPeriodoId = '4f098735-8cea-416a-be52-12e91adbba23'

// ---------- Utilidades ----------
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
const simplificarFraccion = (numerador: number, denominador: number) => {
  const d = gcd(numerador, denominador)
  return { numerador: numerador / d, denominador: denominador / d }
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

  return {
    a,
    b,
    operador: '×',
    denominador1,
    denominador2,
    contexto: contextos[Math.floor(Math.random() * contextos.length)],
  }
}

// ---------- Pistas y ejemplo ----------
const buildHints = (p: Pregunta) => {
  const productoNum = p.a * p.b
  const productoDen = p.denominador1 * p.denominador2
  const simple = simplificarFraccion(productoNum, productoDen)

  // Posibles cancelaciones previas (opcional/avanzado)
  const g1 = gcd(p.a, p.denominador2)
  const g2 = gcd(p.b, p.denominador1)

  return [
    { title: 'Pista 1 — ¿Qué significa multiplicar fracciones?',
      text: 'Es tomar una fracción de otra fracción. Por eso se multiplican numeradores entre sí y denominadores entre sí.' },
    { title: 'Pista 2 — Multiplica numeradores',
      text: `Multiplica ${p.a} × ${p.b}. Ese es el numerador de la respuesta.` },
    { title: 'Pista 3 — Multiplica denominadores',
      text: `Multiplica ${p.denominador1} × ${p.denominador2}. Ese es el denominador de la respuesta.` },
    { title: 'Pista 4 — (Avanzado) Cancela antes de multiplicar',
      text: (g1 > 1 || g2 > 1)
        ? `Puedes simplificar antes: divide ${p.a} y ${p.denominador2} entre ${g1}; y/o divide ${p.b} y ${p.denominador1} entre ${g2}.`
        : 'Si hay un factor común entre un numerador y el otro denominador, puedes dividirlos antes para hacer números más pequeños.' },
    { title: 'Pista 5 — Simplifica el resultado',
      text: `Después de multiplicar, simplifica ${productoNum}/${productoDen} dividiendo por el MCD hasta llegar a ${simple.numerador}/${simple.denominador}.` },
  ]
}

const buildExample = (p: Pregunta) => {
  const num = p.a * p.b
  const den = p.denominador1 * p.denominador2
  const simple = simplificarFraccion(num, den)

  // Cancelación previa (si aplica)
  const g1 = gcd(p.a, p.denominador2)
  const g2 = gcd(p.b, p.denominador1)
  const pre = {
    can1: g1 > 1 ? { a: p.a / g1, d2: p.denominador2 / g1, g: g1 } : null,
    can2: g2 > 1 ? { b: p.b / g2, d1: p.denominador1 / g2, g: g2 } : null,
  }

  const numPre = (pre.can1 ? pre.can1.a : p.a) * (pre.can2 ? pre.can2.b : p.b)
  const denPre = (pre.can2 ? pre.can2.d1 : p.denominador1) * (pre.can1 ? pre.can1.d2 : p.denominador2)
  const simplePre = simplificarFraccion(numPre, denPre)

  return { num, den, simple, pre, numPre, denPre, simplePre }
}

export function FraccionesMultiplicacionStGeorgeGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)

  const [respuestaFinal, setRespuestaFinal] = useState({ numerador: '', denominador: '' })
  const [respuestaSimplificada, setRespuestaSimplificada] = useState({ numerador: '', denominador: '' })

  const [mostrarInputSimplificado, setMostrarInputSimplificado] = useState(false)
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)

  // Guía y pistas
  const [guidedMode, setGuidedMode] = useState(true)
  const [hintIndex, setHintIndex] = useState(0)
  const [showGuidePanel, setShowGuidePanel] = useState(true)
  const [showExample, setShowExample] = useState(false)

  // Mensaje “profe”
  const coachMsg = (() => {
    if (fallosEjercicioActual === 0 && !mostrarInputSimplificado) return 'Multiplica numeradores y denominadores. Luego recién simplifica.'
    if (fallosEjercicioActual === 1) return 'Revisa multiplicaciones básicas y si puedes cancelar factores antes de multiplicar.'
    if (fallosEjercicioActual >= 2) return 'Mira el ejemplo guiado 👇 y vuelve a intentarlo con calma.'
    return '¡Tú puedes!'
  })()

  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const finalNumeradorRef = useRef<HTMLInputElement>(null)
  const finalDenominadorRef = useRef<HTMLInputElement>(null)
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
        setShowExample(false)
        start()
      }
    }
    cargarNivel()
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

  const reiniciarEjercicio = (nuevoNivel: Nivel) => {
    const q = generarPregunta(nuevoNivel)
    setPregunta(q)
    setRespuestaFinal({ numerador: '', denominador: '' })
    setRespuestaSimplificada({ numerador: '', denominador: '' })
    setMostrarInputSimplificado(false)
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
      await registrarRespuestaFinal(false)
      setErrores(prev => prev + 1)
      setAciertos(0)

      let nuevoNivel = nivelActual
      if (errores + 1 >= 3 && nivelActual > 1) {
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('Bajaste de nivel para reforzar la base 📉', { icon: '📉' })
        setErrores(0)
      }
      setTimeout(() => reiniciarEjercicio(nuevoNivel), 1400)
    }
  }

  // Paso 1: multiplicación (sin simplificar aún)
  const verificar = async () => {
    const { a, b, denominador1, denominador2 } = pregunta
    const esperadoNum = a * b
    const esperadoDen = denominador1 * denominador2

    const userNum = parseInt(respuestaFinal.numerador)
    const userDen = parseInt(respuestaFinal.denominador)

    const numCorrecto = userNum === esperadoNum
    const denCorrecto = userDen === esperadoDen

    if (numCorrecto && denCorrecto) {
      toast.success('¡Bien! Ahora simplifica la fracción.')
      setMostrarInputSimplificado(true)
    } else if (numCorrecto && !denCorrecto) {
      toast.error('👀 El numerador está bien. Revisa el denominador (multiplica los denominadores).')
      if (guidedMode) setHintIndex(i => Math.max(i, 3))
      manejarError()
    } else if (!numCorrecto && denCorrecto) {
      toast.error('🧮 El denominador está bien. Revisa el numerador (multiplica los numeradores).')
      if (guidedMode) setHintIndex(i => Math.max(i, 2))
      manejarError()
    } else {
      toast.error('Multiplica numeradores y denominadores directamente (sin simplificar todavía).')
      if (guidedMode) setHintIndex(i => Math.min(i + 1, 3))
      manejarError()
    }
  }

  // Paso 2: simplificación
  const verificarSimplificada = async () => {
    const { a, b, denominador1, denominador2 } = pregunta
    const resultado = simplificarFraccion(a * b, denominador1 * denominador2)

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
        toast('¡Subiste de nivel! 🚀', { icon: '🚀' })
        setAciertos(0)
        setErrores(0)
      }
      setTimeout(() => reiniciarEjercicio(nuevoNivel), 1600)
    } else {
      toast.error('⚠️ Aún puedes simplificar más o revisa el MCD.')
      if (guidedMode) setHintIndex(4)
      manejarError()
    }
  }

  // UI guía
  const hints = buildHints(pregunta)
  const example = buildExample(pregunta)

  return (
    <div className="mx-auto bg-card flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
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

      {/* Panel guía */}
      <AnimatePresence initial={false}>
        {guidedMode && showGuidePanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full overflow-hidden"
          >
            <div className="rounded-lg border border-border p-4 bg-background">
              <h3 className="font-semibold mb-2 text-foreground">Cómo se multiplican fracciones</h3>
              <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground">
                <li>Multiplica <b>numeradores</b> entre sí.</li>
                <li>Multiplica <b>denominadores</b> entre sí.</li>
                <li><b>No simplifiques</b> en este paso.</li>
                <li>Al final, <b>simplifica</b> dividiendo por el MCD.</li>
                <li><i>Avanzado:</i> si puedes, <b>cancela factores</b> entre un numerador y el otro denominador antes de multiplicar.</li>
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

              {/* Ejemplo guiado */}
              <AnimatePresence initial={false}>
                {showExample && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-3 text-sm rounded-md bg-input p-3"
                  >
                    <div className="font-medium mb-1">Ejemplo con estos mismos números</div>
                    <div className="space-y-1">
                      {/* Cancelación previa si aplica */}
                      {example.pre.can1 || example.pre.can2 ? (
                        <div>
                          <div className="font-medium">Cancelación previa (opcional):</div>
                          {example.pre.can1 && (
                            <div>
                              Divide {pregunta!.a} y {pregunta!.denominador2} entre {example.pre.can1.g} → {example.pre.can1.a} y {example.pre.can1.d2}
                            </div>
                          )}
                          {example.pre.can2 && (
                            <div>
                              Divide {pregunta!.b} y {pregunta!.denominador1} entre {example.pre.can2.g} → {example.pre.can2.b} y {example.pre.can2.d1}
                            </div>
                          )}
                          <div>Producto tras cancelar: {example.numPre}/{example.denPre} → simplifica a {example.simplePre.numerador}/{example.simplePre.denominador}</div>
                          <div className="text-xs text-muted-foreground">Nota: También puedes multiplicar directo sin cancelar y simplificar al final.</div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">No hay factores obvios para cancelar antes; multiplica directo.</div>
                      )}

                      {/* Multiplicación directa */}
                      <div className="font-medium mt-2">Multiplicación directa:</div>
                      <div>Numeradores: {pregunta!.a} × {pregunta!.b} = <b>{example.num / pregunta!.denominador1 / pregunta!.denominador2 ? '...' : example.num}</b></div>
                      <div>Denominadores: {pregunta!.denominador1} × {pregunta!.denominador2} = <b>{example.den}</b></div>
                      <div>Resultado: {example.num}/{example.den} → simplifica a <b>{example.simple.numerador}/{example.simple.denominador}</b></div>
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
        <h2 className="text-5xl">×</h2>
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted-foreground mb-2">Fracción 2</span>
          <FractionCanvas numerador={pregunta.b} denominador={pregunta.denominador2} />
        </div>
      </div>

      {/* Paso 1: multiplicación sin simplificar */}
      <>
        <p className="text-center font-medium text-foreground">
          Paso 1: Multiplica numeradores y denominadores. <b>No simplifiques aún.</b>
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
              onClick={() => setHintIndex(i => Math.min(i + 1, 3))}
              className="px-3 py-2 rounded-lg border border-border hover:bg-input text-sm"
            >
              Una pista más
            </button>
          )}
        </div>
      </>

      {/* Paso 2: simplificación */}
      {mostrarInputSimplificado && (
        <div className="w-full space-y-2">
          <p className="text-center font-medium text-foreground">
            Paso 2: Simplifica la fracción final. Divide por el <b>MCD</b>.
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
                onClick={() => setHintIndex(4)}
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
