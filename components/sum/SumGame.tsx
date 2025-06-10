'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

const frasesCorrecto = ['¡Genial!', '¡Eres un crack!', '🎯 ¡Perfecto!', '🔥 ¡Muy bien!']
const frasesIncorrecto = ['Casi, vuelve a intentarlo', 'No te rindas', 'Suma con calma', 'Usa los dedos si necesitas 😊']

const obtenerFrase = (tipo: 'ok' | 'fail') => {
  const frases = tipo === 'ok' ? frasesCorrecto : frasesIncorrecto
  return frases[Math.floor(Math.random() * frases.length)]
}

const descomponer = (num: number) => {
  const str = num.toString()
  const campos = ['Um', 'C', 'D', 'U']
  const resultado: any = {}
  
  // Llenar desde la derecha (unidades hacia la izquierda)
  for (let i = 0; i < campos.length; i++) {
    const digitIndex = str.length - 1 - i
    resultado[campos[campos.length - 1 - i]] = digitIndex >= 0 ? parseInt(str[digitIndex]) : 0
  }
  
  return resultado
}

const obtenerCamposNecesarios = (num: number) => {
  const str = num.toString()
  const campos = ['Um', 'C', 'D', 'U']
  return campos.slice(4 - str.length)
}

const generarPregunta = () => {
  const a = Math.floor(Math.random() * 101) + 30 // 30-130
  const b = Math.floor(Math.random() * 101) + 30 // 30-130
  const c = Math.floor(Math.random() * 101) + 30 // 30-130
  return { a, b, c }
}

export function SumGame() {
  const [pregunta, setPregunta] = useState<{ a: number, b: number, c: number } | null>(null)
  const [paso1, setPaso1] = useState({ Um: '', C: '', D: '', U: '' })
  const [paso2, setPaso2] = useState({ Um: '', C: '', D: '', U: '' })
  const [respuestaFinal, setRespuestaFinal] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [aciertos, setAciertos] = useState(0)
  const [intentos, setIntentos] = useState(0)
  const [paso1Correcto, setPaso1Correcto] = useState(false)
  const [paso2Correcto, setPaso2Correcto] = useState(false)
  const [mostrarAlerta, setMostrarAlerta] = useState(false)
  const [mensajeAlerta, setMensajeAlerta] = useState('')

  // Referencias para auto-focus
  const paso1Refs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const paso2Refs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  useEffect(() => {
    setPregunta(generarPregunta())
  }, [])

  const mostrarNotificacion = (mensaje: string) => {
    setMensajeAlerta(mensaje)
    setMostrarAlerta(true)
    setTimeout(() => setMostrarAlerta(false), 3000)
  }

  const manejarInput = (
    valor: string, 
    campo: string, 
    inputs: typeof paso1, 
    setInputs: typeof setPaso1,
    refs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>,
    camposNecesarios: string[]
  ) => {
    if (/^\d?$/.test(valor)) {
      const nuevosInputs = { ...inputs, [campo]: valor }
      setInputs(nuevosInputs)
      
      // Auto-focus al siguiente campo si hay valor
      if (valor) {
        const indiceActual = camposNecesarios.indexOf(campo)
        if (indiceActual < camposNecesarios.length - 1) {
          const siguienteCampo = camposNecesarios[indiceActual + 1]
          setTimeout(() => {
            refs.current[siguienteCampo]?.focus()
          }, 50)
        }
      }
    }
  }

  const verificarPaso1 = () => {
    if (!pregunta) return
    
    const resultadoEsperado = pregunta.a + pregunta.b
    const camposNecesarios = obtenerCamposNecesarios(resultadoEsperado)
    
    // Verificar que todos los campos necesarios estén llenos
    const camposVacios = camposNecesarios.filter(campo => !paso1[campo as keyof typeof paso1])
    if (camposVacios.length > 0) {
      mostrarNotificacion('¡Completa todos los campos necesarios!')
      return
    }
    
    const descomposicionCorrecta = descomponer(resultadoEsperado)
    
    const inputsCorrectos = camposNecesarios.every(campo => 
      parseInt(paso1[campo as keyof typeof paso1] || '0') === descomposicionCorrecta[campo]
    )
    
    if (inputsCorrectos) {
      setPaso1Correcto(true)
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } })
    } else {
      setMensaje('Revisa la primera operación')
      setTimeout(() => setMensaje(null), 2000)
    }
  }

  const verificarPaso2 = () => {
    if (!pregunta || !paso1Correcto) return
    
    const resultadoPaso1 = pregunta.a + pregunta.b
    const resultadoEsperado = resultadoPaso1 + pregunta.c
    const camposNecesarios = obtenerCamposNecesarios(resultadoEsperado)
    
    // Verificar que todos los campos necesarios estén llenos
    const camposVacios = camposNecesarios.filter(campo => !paso2[campo as keyof typeof paso2])
    if (camposVacios.length > 0) {
      mostrarNotificacion('¡Completa todos los campos necesarios!')
      return
    }
    
    const descomposicionCorrecta = descomponer(resultadoEsperado)
    
    const inputsCorrectos = camposNecesarios.every(campo => 
      parseInt(paso2[campo as keyof typeof paso2] || '0') === descomposicionCorrecta[campo]
    )
    
    if (inputsCorrectos) {
      setPaso2Correcto(true)
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } })
    } else {
      setMensaje('Revisa la segunda operación')
      setTimeout(() => setMensaje(null), 2000)
    }
  }

  const verificarFinal = () => {
    if (!pregunta) return
    
    if (!respuestaFinal) {
      mostrarNotificacion('¡Ingresa la respuesta final!')
      return
    }
    
    const resultadoFinal = pregunta.a + pregunta.b + pregunta.c
    const userAnswer = parseInt(respuestaFinal)
    const nuevosIntentos = intentos + 1
    const esCorrecta = userAnswer === resultadoFinal

    if (esCorrecta) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      setMensaje(obtenerFrase('ok'))
      setAciertos(aciertos + 1)
    } else {
      setMensaje(obtenerFrase('fail'))
    }

    setIntentos(nuevosIntentos)

    setTimeout(() => {
      resetearJuego()
      if (nuevosIntentos >= 3) {
        setIntentos(0)
        setAciertos(0)
      }
    }, 2500)
  }

  const resetearJuego = () => {
    setMensaje(null)
    setPregunta(generarPregunta())
    setPaso1({ Um: '', C: '', D: '', U: '' })
    setPaso2({ Um: '', C: '', D: '', U: '' })
    setRespuestaFinal('')
    setPaso1Correcto(false)
    setPaso2Correcto(false)
  }

  if (!pregunta) return null

  const renderGrid = (
    inputs: typeof paso1, 
    setInputs: typeof setPaso1, 
    title: string,
    operacion: string,
    botonTexto: string,
    onVerificar: () => void,
    deshabilitado: boolean = false,
    resultado: number,
    refs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>
  ) => {
    const camposNecesarios = obtenerCamposNecesarios(resultado)
    const todosCampos = ['Um', 'C', 'D', 'U']
    
    return (
      <motion.div 
        className={`bg-white rounded-lg p-4 border-2 ${deshabilitado ? 'border-gray-300 opacity-50' : 'border-gray-200'}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-sm font-bold mb-2 text-center bg-yellow-200 rounded px-2 py-1">
          {title}
        </h3>
        
        <div className="mb-3 text-center font-semibold text-gray-700">
          {operacion}
        </div>

        <div className="grid grid-cols-4 gap-1 mb-3">
          {/* Headers */}
          {todosCampos.map((campo) => (
            <div 
              key={campo}
              className={`text-center p-2 text-xs font-bold ${
                campo === 'Um' ? 'bg-orange-300' :
                campo === 'C' ? 'bg-green-300' :
                campo === 'D' ? 'bg-blue-300' : 'bg-red-300'
              } ${!camposNecesarios.includes(campo) ? 'opacity-30' : ''}`}
            >
              {campo}
            </div>
          ))}

          {/* Inputs */}
          {todosCampos.map((campo) => {
            const necesario = camposNecesarios.includes(campo)
            return (
              <div key={campo}>
                {necesario ? (
                  <input
                    ref={(el) => { refs.current[campo] = el }}
                    value={inputs[campo as keyof typeof inputs]}
                    onChange={(e) => manejarInput(e.target.value, campo, inputs, setInputs, refs, camposNecesarios)}
                    className="border border-gray-300 text-center p-2 text-sm focus:border-blue-500 focus:outline-none bg-white w-full"
                    maxLength={1}
                    disabled={deshabilitado}
                  />
                ) : (
                  <div className="border border-gray-300 p-2 text-sm bg-gray-100 opacity-30" />
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onVerificar}
            disabled={deshabilitado}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            {botonTexto}
          </button>
          
          <div className="w-8 h-8 bg-white border-2 border-orange-400 rounded-full flex items-center justify-center">
            {((inputs === paso1 && paso1Correcto) || (inputs === paso2 && paso2Correcto)) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-4 h-4 bg-green-500 rounded-full"
              />
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  const resultadoPaso1 = pregunta.a + pregunta.b
  const resultadoFinal = pregunta.a + pregunta.b + pregunta.c

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl shadow-xl max-w-4xl mx-auto space-y-6">
      {/* Notificación de alerta */}
      <AnimatePresence>
        {mostrarAlerta && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              {mensajeAlerta}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-sm text-gray-600 flex justify-between bg-white rounded-lg p-3">
        <span>⭐ Aciertos: {aciertos}</span>
        <span>🌟 Intentos: {intentos}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center bg-white rounded-lg p-4 shadow-md"
      >
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          David recolectó {pregunta.a} manzanas rojas, {pregunta.b} manzanas verdes y luego encontró {pregunta.c} manzanas más. ¿Cuántas manzanas tiene en total?
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Primera operación */}
        {renderGrid(
          paso1, 
          setPaso1, 
          "1° operación", 
          `${pregunta.a} + ${pregunta.b}`,
          "Verificar Paso 1",
          verificarPaso1,
          false,
          resultadoPaso1,
          paso1Refs
        )}

        {/* Segunda operación */}
        {renderGrid(
          paso2, 
          setPaso2, 
          "2° operación", 
          `Resultado anterior + ${pregunta.c}`,
          "Verificar Paso 2",
          verificarPaso2,
          !paso1Correcto,
          resultadoFinal,
          paso2Refs
        )}
      </div>

      {/* Flecha animada */}
      {paso1Correcto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-4xl text-orange-500"
          >
            ➡️
          </motion.div>
        </motion.div>
      )}

      {/* Respuesta final */}
      {paso2Correcto && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg p-6 shadow-lg border-2 border-purple-200"
        >
          <h3 className="text-center font-bold mb-4 text-gray-700">
            David recolectó en total:
          </h3>
          
          <input
            type="number"
            value={respuestaFinal}
            onChange={(e) => setRespuestaFinal(e.target.value)}
            placeholder="Escribe el total aquí"
            className="w-full p-4 rounded-lg border-2 border-purple-300 text-center font-bold text-xl mb-4 focus:border-purple-500 focus:outline-none"
          />
          
          <button
            onClick={verificarFinal}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            ✨ Verificar Respuesta Final ✨
          </button>
        </motion.div>
      )}

      {/* Mensaje de resultado */}
      <AnimatePresence>
        {mensaje && (
          <motion.div
            key={mensaje}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className={`text-center p-6 rounded-xl font-bold text-xl shadow-lg ${
              mensaje.includes('¡')
                ? 'bg-gradient-to-r from-green-400 to-green-500 text-white'
                : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
            }`}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              {mensaje}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}