import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

type ChildLinkRow = {
  student_id: string
  institution_id: string
  relationship: string | null
}

type ProfileRow = {
  id: string
  first_name: string
  last_name: string
  active: boolean | null
}

type InstitutionRow = {
  id: string
  name: string
}

type LearningStatsRow = {
  student_id: string
  classroom_id: string
  total_attempts: number | null
  total_correct: number | null
  total_wrong: number | null
  total_time_seconds: number | null
  last_updated_at: string | null
}

type ClassroomRow = {
  id: string
  grade: string
  section: string | null
  academic_year: number
}

type ExerciseRow = {
  student_id: string
  exercise_id: string | null
  correct: boolean | null
  time_seconds: number | null
  created_at: string | null
}

type FeedbackRow = {
  student_id: string
  teacher_id: string
  comment: string
  created_at: string | null
}

type TeacherRow = {
  id: string
  first_name: string
  last_name: string
}

const dateFmt = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const timeFmt = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
})

function formatDateTime(iso: string | null) {
  if (!iso) return "Sin fecha"
  const d = new Date(iso)
  return `${dateFmt.format(d)} ${timeFmt.format(d)}`
}

function initials(firstName: string, lastName: string) {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  return `${f}${l}`
}

export default async function ParentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  const { data: profile } = await supabase
    .from("edu_profiles")
    .select("first_name, last_name, global_role, active")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.active) {
    redirect("/sign-in")
  }

  if (profile.global_role !== "parent" && profile.global_role !== "admin") {
    redirect("/sign-in")
  }

  const { data: linksData, error: linksErr } = await supabase
    .from("edu_parent_students")
    .select("student_id, institution_id, relationship")
    .eq("parent_id", user.id)
    .eq("active", true)

  if (linksErr) {
    console.error("[Parent Dashboard] parent-students error:", linksErr)
  }

  const childLinks = (linksData ?? []) as ChildLinkRow[]
  const studentIds = Array.from(new Set(childLinks.map((r) => r.student_id)))
  const institutionIds = Array.from(new Set(childLinks.map((r) => r.institution_id)))

  const fullName = `${profile.first_name} ${profile.last_name}`.trim()

  if (studentIds.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <section className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold tracking-tight">Panel de padres</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bienvenido{fullName ? `, ${fullName}` : ""}. Aun no tienes hijos vinculados en `edu_parent_students`.
          </p>
        </section>
      </main>
    )
  }

  const [{ data: childrenData }, { data: institutionsData }, { data: statsData }, { data: exercisesData }, { data: feedbackData }] =
    await Promise.all([
      supabase
        .from("edu_profiles")
        .select("id, first_name, last_name, active")
        .in("id", studentIds),
      supabase.from("edu_institutions").select("id, name").in("id", institutionIds),
      supabase
        .from("edu_student_learning_stats")
        .select("student_id, classroom_id, total_attempts, total_correct, total_wrong, total_time_seconds, last_updated_at")
        .in("student_id", studentIds),
      supabase
        .from("edu_student_exercises")
        .select("student_id, exercise_id, correct, time_seconds, created_at")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("edu_assignment_feedback")
        .select("student_id, teacher_id, comment, created_at")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
        .limit(200),
    ])

  const children = (childrenData ?? []) as ProfileRow[]
  const institutions = (institutionsData ?? []) as InstitutionRow[]
  const stats = (statsData ?? []) as LearningStatsRow[]
  const exercises = (exercisesData ?? []) as ExerciseRow[]
  const feedback = (feedbackData ?? []) as FeedbackRow[]

  const classroomIds = Array.from(new Set(stats.map((s) => s.classroom_id)))
  const teacherIds = Array.from(new Set(feedback.map((f) => f.teacher_id)))

  const [{ data: classroomsData }, { data: teachersData }] = await Promise.all([
    classroomIds.length > 0
      ? supabase
          .from("edu_classrooms")
          .select("id, grade, section, academic_year")
          .in("id", classroomIds)
      : Promise.resolve({ data: [] as ClassroomRow[] }),
    teacherIds.length > 0
      ? supabase
          .from("edu_profiles")
          .select("id, first_name, last_name")
          .in("id", teacherIds)
      : Promise.resolve({ data: [] as TeacherRow[] }),
  ])

  const classrooms = (classroomsData ?? []) as ClassroomRow[]
  const teachers = (teachersData ?? []) as TeacherRow[]

  const childById = new Map(children.map((c) => [c.id, c]))
  const institutionById = new Map(institutions.map((i) => [i.id, i]))
  const classroomById = new Map(classrooms.map((c) => [c.id, c]))
  const teacherById = new Map(teachers.map((t) => [t.id, t]))

  const statsByStudent = new Map<string, LearningStatsRow[]>()
  for (const row of stats) {
    const arr = statsByStudent.get(row.student_id) ?? []
    arr.push(row)
    statsByStudent.set(row.student_id, arr)
  }

  const exercisesByStudent = new Map<string, ExerciseRow[]>()
  for (const row of exercises) {
    const arr = exercisesByStudent.get(row.student_id) ?? []
    arr.push(row)
    exercisesByStudent.set(row.student_id, arr)
  }

  const feedbackByStudent = new Map<string, FeedbackRow[]>()
  for (const row of feedback) {
    const arr = feedbackByStudent.get(row.student_id) ?? []
    arr.push(row)
    feedbackByStudent.set(row.student_id, arr)
  }

  let totalAttempts = 0
  let totalCorrect = 0
  let totalWrong = 0
  let totalTimeSeconds = 0

  for (const row of stats) {
    totalAttempts += row.total_attempts ?? 0
    totalCorrect += row.total_correct ?? 0
    totalWrong += row.total_wrong ?? 0
    totalTimeSeconds += row.total_time_seconds ?? 0
  }

  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0
  const totalHours = (totalTimeSeconds / 3600).toFixed(1)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_55%)]" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">Panel de padres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bienvenido{fullName ? `, ${fullName}` : ""}. Aqui tienes el avance de tus hijos en tiempo real.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Hijos vinculados</p>
          <p className="mt-2 text-2xl font-bold">{studentIds.length}</p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Intentos totales</p>
          <p className="mt-2 text-2xl font-bold">{totalAttempts}</p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Precision global</p>
          <p className="mt-2 text-2xl font-bold">{overallAccuracy}%</p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Tiempo acumulado</p>
          <p className="mt-2 text-2xl font-bold">{totalHours} h</p>
        </article>
      </section>

      <section className="space-y-4">
        {childLinks.map((link) => {
          const child = childById.get(link.student_id)
          if (!child) return null

          const studentStats = statsByStudent.get(link.student_id) ?? []
          const recentExercises = (exercisesByStudent.get(link.student_id) ?? []).slice(0, 4)
          const recentFeedback = (feedbackByStudent.get(link.student_id) ?? []).slice(0, 3)

          let attempts = 0
          let correct = 0
          let wrong = 0
          let timeSeconds = 0
          let lastUpdate: string | null = null

          for (const s of studentStats) {
            attempts += s.total_attempts ?? 0
            correct += s.total_correct ?? 0
            wrong += s.total_wrong ?? 0
            timeSeconds += s.total_time_seconds ?? 0
            if (s.last_updated_at && (!lastUpdate || s.last_updated_at > lastUpdate)) {
              lastUpdate = s.last_updated_at
            }
          }

          const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0
          const institution = institutionById.get(link.institution_id)

          const classroomLabels = Array.from(new Set(studentStats.map((s) => s.classroom_id)))
            .map((id) => classroomById.get(id))
            .filter(Boolean)
            .map((c) => `${c!.grade}${c!.section ? ` ${c!.section}` : ""} (${c!.academic_year})`)

          return (
            <article key={`${link.student_id}-${link.institution_id}`} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {initials(child.first_name, child.last_name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {child.first_name} {child.last_name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {institution?.name ?? "Institucion"} {link.relationship ? `• ${link.relationship}` : ""}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
                  Precision {accuracy}%
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${accuracy}%` }} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Intentos</p>
                  <p className="text-xl font-bold">{attempts}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Aciertos</p>
                  <p className="text-xl font-bold">{correct}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Errores</p>
                  <p className="text-xl font-bold">{wrong}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Tiempo</p>
                  <p className="text-xl font-bold">{Math.round(timeSeconds / 60)} min</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <h3 className="text-sm font-semibold">Actividad reciente</h3>
                  {recentExercises.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Sin actividad reciente.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {recentExercises.map((e, idx) => (
                        <li key={`${e.student_id}-${e.created_at}-${idx}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate">
                            {e.correct === true ? "Correcto" : e.correct === false ? "Incorrecto" : "Sin validar"} •{" "}
                            {e.exercise_id ?? "Ejercicio"}
                          </span>
                          <span className="shrink-0 text-muted-foreground">{formatDateTime(e.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border p-3">
                  <h3 className="text-sm font-semibold">Feedback docente</h3>
                  {recentFeedback.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Sin comentarios recientes.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {recentFeedback.map((f, idx) => {
                        const teacher = teacherById.get(f.teacher_id)
                        const teacherName = teacher
                          ? `${teacher.first_name} ${teacher.last_name}`
                          : "Profesor"
                        return (
                          <li key={`${f.student_id}-${f.created_at}-${idx}`} className="text-xs">
                            <p className="line-clamp-2">{f.comment}</p>
                            <p className="mt-1 text-muted-foreground">
                              {teacherName} • {formatDateTime(f.created_at)}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Ultima actualizacion: {formatDateTime(lastUpdate)}{" "}
                {classroomLabels.length > 0 ? `• Aulas: ${classroomLabels.join(", ")}` : ""}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
