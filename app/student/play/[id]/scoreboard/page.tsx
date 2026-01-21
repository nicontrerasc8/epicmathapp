"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Trophy } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { fetchStudentSession } from "@/lib/student-session-client"

type ScoreRow = {
  studentId: string
  name: string
  trophies: number
  streak: number
  attempts: number
  correct: number
  wrong: number
  lastPlayedAt: string | null
  hasRecord: boolean
}

type ScoreboardPageProps = {
  params: {
    id: string
  }
}

const formatLastPlayed = (value?: string | null) => {
  if (!value) return "—"
  const when = new Date(value)
  if (Number.isNaN(when.getTime())) return "—"
  return when.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ScoreboardPage({ params }: ScoreboardPageProps) {
  const exerciseId = params.id
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    const loadScoreboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const session = await fetchStudentSession()

        if (!session?.student_id) {
          setError("Inicia sesión para ver la tabla de posiciones.")
          setRows([])
          return
        }

        if (!session.classroom_id || !session.institution_id) {
          setError("Aún no perteneces a un aula activa.")
          setRows([])
          return
        }

        const { data: members, error: membersErr } = await supabase
          .from("edu_institution_members")
          .select("profile_id, edu_profiles ( first_name, last_name )")
          .eq("classroom_id", session.classroom_id)
          .eq("institution_id", session.institution_id)
          .eq("role", "student")
          .eq("active", true)

        if (membersErr) throw membersErr

        const studentIds = Array.from(
          new Set(
            (members ?? [])
              .map((m: any) => m.profile_id)
              .filter(Boolean),
          ),
        )

        if (!studentIds.length) {
          setError("Todavía no hay compañeros en el aula.")
          setRows([])
          return
        }

        const { data: gamRows, error: gamErr } = await supabase
          .from("edu_student_gamification")
          .select(
            "student_id, trophies, streak, attempts, correct_attempts, wrong_attempts, last_played_at",
          )
          .eq("exercise_id", exerciseId)
          .in("student_id", studentIds)

        if (gamErr) throw gamErr

        const membershipMap = new Map<string, { first_name?: string | null; last_name?: string | null }>()
        ;(members ?? []).forEach((member: any) => {
          membershipMap.set(member.profile_id, member.edu_profiles ?? {})
        })

        const gamMap = new Map<string, any>()
        ;(gamRows ?? []).forEach((gami: any) => {
          gamMap.set(gami.student_id, gami)
        })

        const scoreboard = studentIds.map((studentId) => {
          const member = membershipMap.get(studentId) ?? {}
          const gami = gamMap.get(studentId)
          const attempts =
            typeof gami?.attempts === "number"
              ? gami.attempts
              : (gami?.correct_attempts ?? 0) + (gami?.wrong_attempts ?? 0)

          return {
            studentId,
            name:
              [member.first_name, member.last_name].filter(Boolean).join(" ") ||
              studentId.slice(0, 8),
            trophies: gami?.trophies ?? 0,
            streak: gami?.streak ?? 0,
            attempts,
            correct: gami?.correct_attempts ?? 0,
            wrong: gami?.wrong_attempts ?? 0,
            lastPlayedAt: gami?.last_played_at ?? null,
            hasRecord: Boolean(gami),
          }
        })

        scoreboard.sort((a, b) => {
          if (b.trophies !== a.trophies) return b.trophies - a.trophies
          if (b.streak !== a.streak) return b.streak - a.streak
          return b.attempts - a.attempts
        })

        if (!active) return
        setRows(scoreboard)

        if (!scoreboard.some((row) => row.hasRecord)) {
          setError("Nadie ha jugado este ejercicio todavía.")
        }
      } catch (err: any) {
        if (!active) return
        setError(err?.message ?? "No se pudo cargar la tabla de posiciones.")
        setRows([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadScoreboard()
    return () => {
      active = false
    }
  }, [exerciseId])

  const podium = useMemo(() => rows.slice(0, 3), [rows])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <Link
            href={`/student/play/${exerciseId}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium hover:bg-muted transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al juego
          </Link>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Tabla de trofeos
            </div>
            <div className="text-base font-semibold">Comparte tu progreso</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        {/* SUMMARY */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Tus compañeros</p>
              <h1 className="text-2xl font-black tracking-tight">
                Clasificación del aula
              </h1>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-500" />
              {rows.reduce((sum, row) => sum + row.trophies, 0)} trofeos
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Cada fila muestra quién ha acumulado más trofeos en este ejercicio.
            ¡Acelera y escala el podio!
          </p>
        </section>

        {/* CONTENT */}
        {loading ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted px-5 py-10 text-center text-sm text-muted-foreground">
            Cargando tabla de posiciones…
          </div>
        ) : error && !rows.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted px-5 py-10 text-center text-sm text-destructive">
            {error}
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-2xl border border-yellow-300 bg-yellow-50 px-5 py-3 text-sm text-yellow-800">
                {error}
              </div>
            )}

            {/* PODIUM */}
            <div className="grid gap-4 md:grid-cols-2">
              {podium.map((row, idx) => (
                <div
                  key={row.studentId}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span># {idx + 1}</span>
                    <span>Racha: {row.streak}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-foreground">
                      {row.trophies}
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.correct} ✔ · {row.wrong} ✖ · {row.attempts} intentos
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Último juego: {formatLastPlayed(row.lastPlayedAt)}
                  </p>
                </div>
              ))}
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Trofeos</th>
                    <th className="px-4 py-3">Racha</th>
                    <th className="px-4 py-3">Aciertos/Errores</th>
                    <th className="px-4 py-3">Última vez</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, index) => (
                    <tr
                      key={row.studentId}
                      className={
                        row.hasRecord
                          ? "hover:bg-muted transition"
                          : "text-muted-foreground"
                      }
                    >
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3 font-semibold">{row.trophies}</td>
                      <td className="px-4 py-3">{row.streak}</td>
                      <td className="px-4 py-3">
                        {row.correct} / {row.wrong}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatLastPlayed(row.lastPlayedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
