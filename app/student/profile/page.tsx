'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Trophy } from 'lucide-react'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import { useInstitution } from '@/components/institution-provider'

type PasswordUpdateState = {
  newPassword: string
  confirmPassword: string
}

type PlaySummary = {
  trophies: number
  attempts: number
  correct: number
  wrong: number
  sessions: number
  lastPlayed: string | null
}

const formatLastPlayed = (value?: string | null) => {
  if (!value) return 'Nunca'
  const when = new Date(value)
  if (Number.isNaN(when.getTime())) return '—'
  return when.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function StudentProfilePage() {
  const { student, loading } = useStudent(true)
  const institution = useInstitution()
  const supabase = useMemo(() => createClient(), [])

  const [passwordState, setPasswordState] = useState<PasswordUpdateState>({
    newPassword: '',
    confirmPassword: '',
  })
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [summary, setSummary] = useState<PlaySummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const handleUpdatePassword = async () => {
    setPasswordMessage(null)
    setPasswordError(null)

    const { newPassword, confirmPassword } = passwordState

    if (!newPassword || !confirmPassword) {
      setPasswordError('Ingresa ambas contraseñas.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    try {
      setUpdatingPassword(true)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setPasswordError(error.message)
      } else {
        setPasswordMessage('Contraseña actualizada correctamente.')
        setPasswordState({ newPassword: '', confirmPassword: '' })
      }
    } catch (err) {
      setPasswordError('Ocurrió un error inesperado.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const displayName = useMemo(() => {
    if (!student) return 'Estudiante'
    const fullName = [student.first_name, student.last_name].filter(Boolean).join(' ')
    return fullName.trim() || student.email || 'Estudiante'
  }, [student])

  useEffect(() => {
    if (!student?.student_id) {
      setSummary(null)
      setSummaryError(null)
      setSummaryLoading(false)
      return
    }

    let active = true

    const loadSummary = async () => {
      setSummaryLoading(true)
      setSummaryError(null)

      try {
        const { data, error } = await supabase
          .from('edu_student_gamification')
          .select('trophies, attempts, correct_attempts, wrong_attempts, last_played_at')
          .eq('student_id', student.student_id)

        if (error) throw error

        if (!data || !data.length) {
          if (active) {
            setSummary(null)
            setSummaryError('Aún no hay partidas registradas.')
          }
          return
        }

        const aggregated = data.reduce<PlaySummary>(
          (acc, row) => {
            const rowAttempts =
              typeof row.attempts === 'number'
                ? row.attempts
                : (row.correct_attempts ?? 0) + (row.wrong_attempts ?? 0)

            const lastPlayedTs = row.last_played_at
              ? new Date(row.last_played_at).getTime()
              : 0
            const currentLast = acc.lastPlayed
              ? new Date(acc.lastPlayed).getTime()
              : 0

            if (lastPlayedTs && lastPlayedTs > currentLast) {
              acc.lastPlayed = row.last_played_at
            }

            acc.trophies += row.trophies ?? 0
            acc.attempts += rowAttempts
            acc.correct += row.correct_attempts ?? 0
            acc.wrong += row.wrong_attempts ?? 0
            acc.sessions += 1

            return acc
          },
          {
            trophies: 0,
            attempts: 0,
            correct: 0,
            wrong: 0,
            sessions: 0,
            lastPlayed: null,
          },
        )

        if (active) {
          setSummary(aggregated)
        }
      } catch (err: any) {
        if (active) {
          setSummaryError(err?.message ?? 'No se pudo cargar tu resumen de juego.')
        }
      } finally {
        if (active) {
          setSummaryLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      active = false
    }
  }, [student?.student_id, supabase])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
        Cargando tu perfil...
      </div>
    )
  }

  if (!student) {
    return null
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="space-y-3 rounded-3xl border border-border bg-card/70 p-6 text-center shadow-lg">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Tu perfil</p>
        <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
        <p className="text-sm text-muted-foreground">{institution?.name ?? 'Sin institución asignada'}</p>
        {institution?.slug && (
          <span className="inline-flex rounded-full border border-border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-foreground">
            {institution.slug}
          </span>
        )}
      </header>

      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-card p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Copas ganadas
              </p>
              <p className="text-2xl font-bold text-foreground">
                {summary?.trophies ?? 0}
              </p>
            </div>
          </div>
          {!summaryLoading && !summary && (
            <p className="text-xs text-muted-foreground">{summaryError ?? 'Sin actividad aún'}</p>
          )}
        </div>

        {summaryLoading ? (
          <p className="text-sm text-muted-foreground">Consultando tu historial de juego…</p>
        ) : summary ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-white/60 p-3 text-center">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                Sesiones registradas
              </p>
              <p className="text-lg font-semibold text-foreground">{summary.sessions}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white/60 p-3 text-center">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                Intentos totales
              </p>
              <p className="text-lg font-semibold text-foreground">{summary.attempts}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white/60 p-3 text-center">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                Aciertos / errores
              </p>
              <p className="text-lg font-semibold text-foreground">
                {summary.correct} / {summary.wrong}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-white/60 p-3 text-center">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                Última vez
              </p>
              <p className="text-lg font-semibold text-foreground">
                {formatLastPlayed(summary.lastPlayed)}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-lg space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Seguridad</p>
          <h2 className="text-2xl font-semibold text-foreground">Cambiar contraseña</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Actualiza tu contraseña de Supabase Auth cuando lo necesites y asegúrate de guardarla en un lugar seguro.
        </p>

        <div className="space-y-3 text-sm">
          {[
            { key: "newPassword", label: "Nueva contraseña" },
            { key: "confirmPassword", label: "Confirmar contraseña" },
          ].map((field) => (
            <label
              key={field.key}
              className="flex flex-col gap-1 text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground"
            >
              <span>{field.label}</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordState[field.key as keyof PasswordUpdateState]}
                  onChange={(event) =>
                    setPasswordState((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-12 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          ))}
        </div>

        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        {passwordMessage && <p className="text-sm text-success">{passwordMessage}</p>}

        <button
          type="button"
          disabled={updatingPassword}
          onClick={handleUpdatePassword}
          className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {updatingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </section>
    </div>
  )
}

