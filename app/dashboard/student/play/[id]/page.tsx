// app/tema/[id]/play/page.tsx
// @ts-nocheck
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import GameRenderer from '@/components/GameRenderer'
import { motion, AnimatePresence } from 'framer-motion'
import { BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

/************ FLAGS UI ************/
const DEV_TOOLS = false // Si true, muestra botón "Autocompletar" para docentes

/************ HELPERS ************/
const fmt = (x: any, d = 2) => {
  const n = Number(x)
  if (!isFinite(n)) return String(x)
  return n.toFixed(d)
}

function sampleParams(params: Record<string, [number, number]>) {
  const out: Record<string, number> = {}
  for (const k in params || {}) {
    const [min, max] = params[k]
    const wide = (max - min) > 10
    const step = wide ? 1 : 0.5
    const m = Math.round(1 / step)
    const rnd = min + Math.floor(Math.random() * (max - min) * m) / m
    out[k] = Number(rnd.toFixed(2))
  }
  return out
}

function evalExpr(expr: string, VAL: any) {
  const fn = new Function('VAL', 'Math', 'Number', `'use strict'; return (${expr});`)
  const r = fn(VAL || {}, Math, Number)
  if (typeof r !== 'number' || !isFinite(r)) throw new Error('Bad expr: ' + expr)
  return r
}

function buildVAL(variant: any, sampled: any) {
  const VAL: any = { ...(sampled || {}) }
  if (variant?.render_fill) {
    for (const k in variant.render_fill) {
      VAL[k] = evalExpr(variant.render_fill[k], VAL)
    }
  }
  const correct = evalExpr(variant?.answer?.expr, VAL)
  return {
    VAL: { ...VAL, resultado: correct },
    correct,
    resultado: correct
  }
}

function withinTol(x: number, y: number, t: any) {
  const dx = Math.abs(x - y)
  if (t?.abs != null && dx <= t.abs) return true
  if (t?.rel != null) {
    const base = Math.max(1e-9, Math.abs(y))
    if (dx / base <= t.rel) return true
  }
  return false
}

function findLevelItem(reglas: any[], nivel: number) {
  for (const r of reglas || []) {
    const d = typeof r.dsl === 'string' ? JSON.parse(r.dsl) : r.dsl
    if (Array.isArray(d)) {
      const it = d.find((x: any) => String(x.id || '').includes(`nivel-${nivel}`))
      if (it) return { regla: r, item: it }
    } else if (d?.id && String(d.id).includes(`nivel-${nivel}`)) {
      return { regla: r, item: d }
    }
  }
  return null
}

// 🎯 Parser de steps con soporte LaTeX y {{vars}}
function parseStep(step: any, VAL: any) {
  if (!step) return { text: '', formula: '' }
  let text = step.text || ''
  let formula = step.formula
  for (const k in VAL) {
    const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g')
    const value = fmt(VAL[k])
    text = text.replace(regex, value)
    if (formula) formula = formula.replace(regex, value)
  }
  return { text: text.trim(), formula: formula ? formula.trim() : '' }
}

/************ ADAPTIVE / IRT-LITE ************/
const logistic = (x: number) => 1 / (1 + Math.exp(-x))
const probCorrect = (theta: number, diff: number) => logistic(1.7 * (theta - diff))

function getVariantDifficulty(variant: any, nivel: number) {
  if (variant?.difficulty != null) return Number(variant.difficulty)
  // fallback por nivel (calibra con tus datos reales)
  return nivel === 1 ? -0.6 : (nivel === 2 ? 0.0 : 0.8)
}

// Calidad por intento: 1.0 (intento 1–2), 0.4 (acierto tardío 3+), 0 (fallo)
function qualityFromAttempt(isCorrect: boolean, attemptIndex: number) {
  if (!isCorrect) return 0
  return attemptIndex <= 1 ? 1.0 : 0.4
}

function updateThetaSmart({
  theta, diff, quality, timeSec, targetSec = 40
}: {
  theta: number, diff: number, quality: number, timeSec: number, targetSec?: number
}) {
  const p = probCorrect(theta, diff) // prob. esperada (modelo)
  let K = 0.6
  const speed = Math.min(1.6, targetSec / Math.max(5, timeSec))
  K = K * (0.7 + 0.3 * speed)
  const nextTheta = theta + K * (quality - p)
  return { nextTheta, p }
}

function thetaToLevel(theta: number) {
  if (theta < -0.5) return 1
  if (theta < 0.7) return 2
  return 3
}

function pickAdaptiveVariant(dsl: any, nivel: number, theta: number) {
  const variants = dsl?.variants || []
  if (!variants.length) return null
  let best = variants[0], bestGap = Infinity
  for (const v of variants) {
    const d = getVariantDifficulty(v, nivel)
    const p = probCorrect(theta, d)
    const gap = Math.abs(p - 0.65) // Target ~65% éxito
    if (gap < bestGap) { bestGap = gap; best = v }
  }
  return best
}

/************ MAIN COMPONENT ************/
export default function TemaPlayPage() {
  const { id } = useParams()
  const supabase = createClient()

  const [tema, setTema] = useState<any>(null)
  const [reglas, setReglas] = useState<any[]>([])
  const [ej, setEj] = useState<any>(null)

  const [nivel, setNivel] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail' | 'revealed'>('idle')
  const [aciertos, setAciertos] = useState(0) // aciertos REALES (1er/2do intento)
  const [errores, setErrores] = useState(0)   // fallos REALES (fallo revelado)
  const [loading, setLoading] = useState(true)
  const [respuesta, setRespuesta] = useState('')

  // Adaptativo persistente
  const [userId, setUserId] = useState<string | null>(null)
  const [ability, setAbility] = useState(0) // theta
  const [streak, setStreak] = useState(0)   // racha de aciertos REALES
  const [revealStreak, setRevealStreak] = useState(0) // racha de reveals/agotados
  const [startAt, setStartAt] = useState<number>(Date.now()) // inicio del ítem (ms)

  const inputRef = useRef<HTMLInputElement | null>(null)

  // Carga inicial
  useEffect(() => {
    (async () => {
      if (!id || typeof id !== 'string') return
      const { data: userRes } = await supabase.auth.getUser()
      if (!userRes?.user) {
        setLoading(false)
        toast.error('Inicia sesión para guardar tu progreso')
        return
      }
      setUserId(userRes.user.id)

      const { data: tp } = await supabase
        .from('tema_periodo')
        .select('id, tema')
        .eq('id', id)
        .single()
      setTema(tp || null)

      // Carga o crea estado del alumno
      let { data: sp } = await supabase
        .from('student_periodo')
        .select('*')
        .eq('student_id', userRes.user.id)
        .eq('tema_periodo_id', id)
        .maybeSingle()

      if (!sp) {
        const { data: created } = await supabase
          .from('student_periodo')
          .insert({
            student_id: userRes.user.id,
            tema_periodo_id: id,
            nivel: 1,
            theta: 0,
            aciertos: 0,
            errores: 0,
            streak: 0,
          })
          .select()
          .single()
        sp = created
      }

      if (sp) {
        setNivel(sp.nivel ?? 1)
        setAbility(sp.theta ?? 0)
        setAciertos(sp.aciertos ?? 0)
        setErrores(sp.errores ?? 0)
        setStreak(sp.streak ?? 0)
      }

      const { data: raws, error } = await supabase
        .from('rules')
        .select('*')
        .eq('tema_periodo_id', id)
        .eq('enabled', true)

      if (error) {
        toast.error('Error cargando reglas')
        setLoading(false)
        return
      }

      const parsed = (raws || []).map((r: any) => ({
        ...r,
        dsl: typeof r.dsl === 'string' ? JSON.parse(r.dsl) : r.dsl
      }))
      setReglas(parsed)

      nueva(sp?.nivel ?? 1, parsed, sp?.theta ?? 0)
      setLoading(false)
    })()
  }, [id])

  // Nueva pregunta (adaptativa)
  function nueva(nivelActual: number, reglasData?: any[], thetaOverride?: number) {
    const data = reglasData || reglas
    const match = findLevelItem(data, nivelActual)
    if (!match) {
      toast.error(`No hay preguntas para nivel ${nivelActual}`)
      return
    }
    const pack = match.item
    const dsl = pack?.dsl || pack
    if (dsl?.schema !== 'mx.v3') {
      toast.error('Se espera schema mx.v3')
      return
    }

    const theta = typeof thetaOverride === 'number' ? thetaOverride : ability
    const variant = pickAdaptiveVariant(dsl, nivelActual, theta) || (dsl?.variants || [])[0]
    if (!variant) {
      toast.error('Sin variantes')
      return
    }

    const sampled = sampleParams(variant.params || {})
    const { VAL, correct } = buildVAL(variant, sampled)

    setEj({
      dsl,
      variant,
      VAL,
      correct,
      name: pack?.name || match.regla?.name || 'Ejercicio',
      nivel: nivelActual
    })
    setAttempt(0)
    setStatus('idle')
    setRespuesta('')
    setStartAt(Date.now())
    setRevealStreak(0) // resetea la racha de reveal al cambiar de ítem

    // focus al input
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // UI helpers
  const tol = ej?.variant?.attempts?.tolerance || { decimals: 2 }
  const units = ej?.variant?.units_out ?? ej?.dsl?.units_out ?? ''
  const maxAtt = ej?.variant?.attempts?.max ?? 0
  const decimals = tol.decimals ?? 2
  const pva = ej?.dsl?.pva || {}

  const pctAttempts = useMemo(
    () => Math.min(1, attempt / Math.max(1, maxAtt)),
    [attempt, maxAtt]
  )

  const prompt = useMemo(() => {
    if (!ej) return ''
    const g = (ej.variant?.givens || []).map((k: string) => {
      const v = ej.VAL[k]
      return `${k} = ${k === 'theta' ? fmt(v, 0) + '°' : fmt(v)}`
    }).join(', ')
    return `Calcula ${ej.variant?.unknown} (${units}). Datos: ${g}.`
  }, [ej, units])

  const showSolution = useMemo(() => {
    const ra = ej?.variant?.attempts?.reveal_after ?? Infinity
    return attempt >= ra || ['revealed', 'ok'].includes(status)
  }, [attempt, status, ej])

  const availableHints = useMemo(() => {
    const hints = ej?.variant?.attempts?.hints || []
    return hints
      .filter((h: any) => attempt >= (h.after ?? Infinity))
      .map((h: any) => parseStep(h, ej?.VAL || {}))
  }, [ej, attempt])

  const solutionSteps = useMemo(() => {
    if (!ej?.variant?.solution?.steps) return []
    return (ej.variant.solution.steps || []).map((step: any) => parseStep(step, ej.VAL))
  }, [ej])

  /************ Persistencia ************/
  async function saveProgress({ nivel, theta, aciertos, errores, streak }: {
    nivel: number, theta: number, aciertos: number, errores: number, streak: number
  }) {
    if (!userId || !id) return
    await supabase.from('student_periodo').upsert({
      student_id: userId,
      tema_periodo_id: id,
      nivel,
      theta,
      aciertos,
      errores,
      streak,
      last_seen: new Date().toISOString()
    }, { onConflict: 'student_id,tema_periodo_id' })
  }

  async function logAttempt({ correct, variantId, respuesta, correctValue, nivel, attemptIndex, timeSec, isTrueSuccess }: {
    correct: boolean, variantId?: string, respuesta?: number, correctValue?: number,
    nivel: number, attemptIndex: number, timeSec: number, isTrueSuccess: boolean
  }) {
    if (!userId || !id) return
    await supabase.from('student_attempt').insert({
      student_id: userId,
      tema_periodo_id: id,
      nivel,
      variant_id: variantId || null,
      correct,
      respuesta: isFinite(Number(respuesta)) ? Number(respuesta) : null,
      correct_value: isFinite(Number(correctValue)) ? Number(correctValue) : null,
      attempt_index: attemptIndex,
      elapsed_seconds: Math.min(999, Math.max(0, Math.round(timeSec))),
      true_success: isTrueSuccess
    })
  }

  // Verificar
  async function verificar() {
    if (!ej) return
    const val = Number(String(respuesta).replace(',', '.'))
    if (Number.isNaN(val)) {
      toast.error('Ingresa un número válido')
      return
    }

    const attemptIndex = attempt // 0-based antes de verificar
    const ok = withinTol(val, ej.correct, tol)
    const timeSec = Math.max(0.1, (Date.now() - startAt) / 1000)

    const diff = getVariantDifficulty(ej.variant, nivel)
    const quality = qualityFromAttempt(ok, attemptIndex)
    const { nextTheta, p } = updateThetaSmart({
      theta: ability,
      diff,
      quality,
      timeSec,
      targetSec: pva?.target_time_sec ?? 40
    })

    // --- REGLAS DOCENTES / PVA ---
    // Acierto real: intento 0 o 1
    const isTrueSuccess = ok && attemptIndex <= 1
    // Fallo revelado: se acaban intentos (luego de este chequeo)
    const willExhaust = !ok && (attemptIndex + 1) >= maxAtt

    // 1) Contadores visibles coherentes
    let newAciertos = aciertos
    let newErrores = errores
    let newStreak = streak
    let newNivel = nivel
    let nextRevealStreak = revealStreak

    if (isTrueSuccess) {
      newAciertos += 1
      newStreak += 1
      nextRevealStreak = 0
    }

    if (willExhaust) {
      newErrores += 1
      newStreak = 0
      nextRevealStreak = revealStreak + 1

      // Democión base (-1)
      if (newNivel > 1) newNivel = newNivel - 1

      // Democión dura si hay racha de reveals (pva.demote)
      const hardThr = pva?.demote?.hard_reveal_streak ?? Infinity
      const multiDrop = pva?.demote?.multi_drop_levels ?? 1
      if (nextRevealStreak >= hardThr && newNivel > 1 && multiDrop > 1) {
        const totalDrop = Math.min(multiDrop - 1, newNivel - 1) // ya bajó 1
        newNivel = newNivel - totalDrop
        toast.error(`⤵️ Baja adicional por errores consecutivos. Nivel ${newNivel}`)
      } else {
        toast.error(`📉 Bajaste al Nivel ${newNivel}`)
      }
    }

    // 2) Subir de nivel por maestría (streak real)
    const needStreak = pva?.mastery?.true_streak_for_level_up ?? 3
    if (newStreak >= needStreak && newNivel < 3) {
      // Salto doble: sólo si venía del 1, muy alta p esperada y rápido
      const dblThr = pva?.mastery?.double_jump_threshold
      const spdFactor = pva?.mastery?.double_jump_speed_factor ?? 0.5
      const targetTime = pva?.target_time_sec ?? 40

      if (
        newNivel === 1 &&
        dblThr != null &&
        p >= dblThr &&
        timeSec <= targetTime * spdFactor
      ) {
        newNivel = Math.min(3, newNivel + 2)
        toast.success('🚀 ¡Salto doble por dominio y velocidad! Nivel 3')
      } else {
        newNivel = newNivel + 1
        toast.success(`🎉 ¡Subiste al Nivel ${newNivel}!`)
      }
      newStreak = 0
    }

    // 3) UI feedback
    if (ok) {
      toast.success(`✅ Correcto: ${fmt(ej.correct, tol.decimals ?? 2)} ${units}`)
      confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } })
      setStatus('ok')
    } else {
      const next = attempt + 1
      setAttempt(next)
      if (willExhaust) {
        toast.error(`❌ Incorrecto. Respuesta: ${fmt(ej.correct, tol.decimals ?? 2)} ${units}`)
        setStatus('revealed')
      } else {
        setStatus('fail')
      }
    }

    // Aplicar estados y persistir
    setAciertos(newAciertos)
    setErrores(newErrores)
    setStreak(newStreak)
    setAbility(nextTheta)
    setNivel(newNivel)
    setRevealStreak(nextRevealStreak)

    // Log + progreso
    logAttempt({
      correct: ok,
      variantId: ej?.variant?.id,
      respuesta: val,
      correctValue: ej.correct,
      nivel: newNivel,
      attemptIndex,
      timeSec,
      isTrueSuccess
    })
    saveProgress({
      nivel: newNivel,
      theta: nextTheta,
      aciertos: newAciertos,
      errores: newErrores,
      streak: newStreak
    })
  }

  // Render
  if (loading) return <div className="p-6">Cargando...</div>
  if (!ej) return <div className="p-6 text-amber-600">⚠️ Generando pregunta…</div>

  return (
    <div
      className="min-h-screen bg-background text-foreground p-6"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(59,130,246,.08), transparent 40%), radial-gradient(ellipse at bottom, rgba(250,204,21,.08), transparent 40%)'
      }}
    >
      <h1 className="text-2xl font-bold mb-2 text-center">
        {tema?.tema || 'Trabajo y energía'}
      </h1>

      {/* Chips visibles mínimos y coherentes (sin mostrar métricas internas) */}
      <div className="mx-auto max-w-3xl mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-card px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">Nivel</div>
          <div className="text-lg font-semibold">{nivel}</div>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">✅ Aciertos</div>
          <div className="text-lg font-semibold">{aciertos}</div>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">❌ Fallos</div>
          <div className="text-lg font-semibold">{errores}</div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl bg-card rounded-2xl shadow p-6 space-y-6">
        {/* Prompt */}
        <p className="text-lg text-center">{prompt}</p>

        {/* Canvas */}
        <div className="relative">
          <GameRenderer
            pregunta={{ dsl: { display: ej.dsl.display, canvas: ej.dsl.canvas } }}
            valores={ej.VAL}
          />
        </div>

        {/* Barra de intentos */}
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-2 bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pctAttempts * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Hints/Pistas progresivas */}
        <AnimatePresence>
          {availableHints.length > 0 && status !== 'ok' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <div className="text-amber-900 font-semibold mb-2">Pistas</div>
              <ul className="space-y-2">
                {availableHints.map((h, i) => (
                  <li key={i} className="text-sm text-amber-900">
                    {h.text && <p className="mb-1">• {h.text}</p>}
                    {h.formula && (
                      <div className="bg-white rounded p-2 border inline-block">
                        <BlockMath math={h.formula} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <motion.div
          animate={status === 'fail' ? { x: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.45 }}
          className="mx-auto w-full sm:w-2/3"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={respuesta}
              onChange={e => setRespuesta(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verificar()}
              placeholder={`Tu respuesta (${ej?.variant?.unknown})`}
              aria-label="Tu respuesta"
              className={`w-full text-center text-xl rounded-xl border px-5 py-3 bg-input outline-none transition focus:ring-2 focus:ring-ring ${
                status === 'ok' ? 'border-green-500' : (status === 'fail' ? 'border-red-300' : 'border-border')
              }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {units}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {[-1, -0.1, +0.1, +1].map((delta) => (
              <button
                key={delta}
                onClick={() =>
                  setRespuesta(v => {
                    const n = Number(String(v || '0').replace(',', '.')) || 0
                    return fmt(n + delta, decimals)
                  })
                }
                className="text-xs px-2 py-1 rounded-md border hover:bg-muted"
                type="button"
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRespuesta('')}
              className="text-xs px-2 py-1 rounded-md border hover:bg-muted"
            >
              Limpiar
            </button>
            {DEV_TOOLS && (
              <button
                type="button"
                onClick={() => setRespuesta(fmt(ej.correct, decimals))}
                className="text-xs px-2 py-1 rounded-md border hover:bg-muted"
                title="Autocompletar con la respuesta (pruebas docentes)"
              >
                Autocompletar
              </button>
            )}
          </div>
        </motion.div>

       <div className="flex items-center justify-center gap-4">
  <motion.button
    whileTap={{ scale: status === 'ok' || status === 'revealed' ? 1 : 0.98 }}
    onClick={() => {
      if (status === 'ok' || status === 'revealed') return
      verificar()
    }}
    disabled={status === 'ok' || status === 'revealed'}
    className={`px-6 py-2 rounded-lg shadow transition 
      ${status === 'ok' || status === 'revealed'
        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
        : 'bg-primary text-primary-foreground hover:opacity-90'}
    `}
  >
    {status === 'ok' ? '¡Correcto!' : status === 'revealed' ? 'Revelado' : 'Verificar'}
  </motion.button>

  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={() => nueva(nivel)}
    className="border border-border px-6 py-2 rounded-lg hover:bg-muted"
  >
    Siguiente
  </motion.button>
</div>


        {/* Solución con LaTeX */}
        <AnimatePresence>
          {showSolution && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">✨</span>
                <p className="text-lg font-bold text-emerald-900">Solución paso a paso</p>
              </div>

              <div className="space-y-4">
                {(ej?.variant?.solution?.steps || []).map((step: any, i: number) => {
                  const s = parseStep(step, ej.VAL)
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="bg-white rounded-lg p-4 shadow-sm border border-emerald-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {s.text && <p className="text-sm text-gray-700 mb-2">{s.text}</p>}
                          {s.formula && (
                            <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                              <BlockMath math={s.formula} />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Respuesta final */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (ej?.variant?.solution?.steps?.length || 0) * 0.12 + 0.2 }}
                className="mt-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-5 text-white shadow-lg"
              >
                <p className="text-sm font-medium mb-1 opacity-90">Respuesta final</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{fmt(ej?.correct, decimals)}</span>
                  <span className="text-lg opacity-90">{units}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

