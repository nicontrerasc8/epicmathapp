'use client'

import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type Pregunta = {
  a: number
  b: number
  opciones: number[]
  correcta: number
}

const generarPregunta = (): Pregunta => {
  const a = Math.floor(Math.random() * 10)
  const b = Math.floor(Math.random() * 10)
  const correcta = a + b

  const opciones = [correcta]
  while (opciones.length < 3) {
    const distractor = correcta + (Math.floor(Math.random() * 5) - 2)
    if (!opciones.includes(distractor) && distractor >= 0) {
      opciones.push(distractor)
    }
  }

  return {
    a,
    b,
    correcta,
    opciones: opciones.sort(() => Math.random() - 0.5),
  }
}

const frasesCorrecto = ['¡Genial!', '¡Eres un crack!', '🎯 ¡Perfecto!', '🔥 ¡Muy bien!']
const frasesIncorrecto = ['Casi, vuelve a intentarlo', 'No te rindas', 'Suma con calma', 'Usa los dedos si necesitas 😊']

const obtenerFrase = (tipo: 'ok' | 'fail') => {
  const frases = tipo === 'ok' ? frasesCorrecto : frasesIncorrecto
  return frases[Math.floor(Math.random() * frases.length)]
}

const obtenerTip = (a: number, b: number) => {
  return `✏️ Tip: Cuando sumas ${a} + ${b}, empieza desde ${Math.min(a, b)} y cuenta ${Math.abs(a - b)} números más.`
}

export function SumGame() {
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const [intentos, setIntentos] = useState(0)
  const [aciertos, setAciertos] = useState(0)

  useEffect(() => {
    setPregunta(generarPregunta())
  }, [])

  const guardarResultado = async (aciertosFinal: number, intentosFinal: number) => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return

    await supabase.from('resultados_sets').insert({
      user_id: user.id,
      nivel: 'nivel_1',
      aciertos: aciertosFinal,
      intentos: intentosFinal,
    })
  }

  const verificarRespuesta = (respuesta: number) => {
    if (!pregunta) return

    const esCorrecta = respuesta === pregunta.correcta
    const nuevaIntentos = intentos + 1
    const nuevosAciertos = esCorrecta ? aciertos + 1 : aciertos

    if (esCorrecta) {
      confetti({ particleCount: 80, spread: 70 })
      setMensaje(obtenerFrase('ok'))
    } else {
      const frase = obtenerFrase('fail')
      const tip = obtenerTip(pregunta.a, pregunta.b)
      setMensaje(`${frase}\n${tip}`)
    }

    // Si termina el set (5 intentos), guardar antes de reiniciar
    if (nuevaIntentos >= 5) {
      guardarResultado(nuevosAciertos, nuevaIntentos)
      setTimeout(() => {
        setIntentos(0)
        setAciertos(0)
        setMensaje(null)
        setPregunta(generarPregunta())
        setKey(prev => prev + 1)
      }, 1500)
    } else {
      setTimeout(() => {
        setIntentos(nuevaIntentos)
        setAciertos(nuevosAciertos)
        setMensaje(null)
        setPregunta(generarPregunta())
        setKey(prev => prev + 1)
      }, 1000)
    }
  }

  if (!pregunta) return null

  return (
    <div className="bg-card p-6 rounded-xl shadow-xl text-center max-w-md w-full space-y-4">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>⭐ Aciertos: {aciertos}</span>
        <span>🎯 Intentos: {intentos}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-bold">¿Cuánto es {pregunta.a} + {pregunta.b}?</h2>

          <div className="flex justify-center gap-4">
            {pregunta.opciones.map((op) => (
              <button
                key={op}
                onClick={() => verificarRespuesta(op)}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition"
              >
                {op}
              </button>
            ))}
          </div>

          {mensaje && (
            <motion.div
              key={mensaje}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 rounded-lg font-semibold text-lg whitespace-pre-wrap ${
                mensaje.includes('¡')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {mensaje}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
