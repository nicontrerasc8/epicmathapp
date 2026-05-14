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
  total_time_seconds: number | null
  last_updated_at: string | null
}

type ClassroomRow = {
  id: string
  grade: string
  section: string | null
  academic_year: number
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
            Bienvenido{fullName ? `, ${fullName}` : ""}. Aun no tienes hijos vinculados.
          </p>
        </section>
      </main>
    )
  }

  const [{ data: childrenData }, { data: institutionsData }, { data: statsData }, { data: feedbackData }] =
    await Promise.all([
      supabase
        .from("edu_profiles")
        .select("id, first_name, last_name, active")
        .in("id", studentIds),
      supabase.from("edu_institutions").select("id, name").in("id", institutionIds),
      supabase
        .from("edu_student_learning_stats")
        .select("student_id, classroom_id, total_time_seconds, last_updated_at")
        .in("student_id", studentIds),
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

  const childById = new Map(children.map((c) => [c.id, c]))
  const institutionById = new Map(institutions.map((i) => [i.id, i]))
  const classroomById = new Map(((classroomsData ?? []) as ClassroomRow[]).map((c) => [c.id, c]))
  const teacherById = new Map(((teachersData ?? []) as TeacherRow[]).map((t) => [t.id, t]))

  const statsByStudent = new Map<string, LearningStatsRow[]>()
  for (const row of stats) {
    const arr = statsByStudent.get(row.student_id) ?? []
    arr.push(row)
    statsByStudent.set(row.student_id, arr)
  }

  const feedbackByStudent = new Map<string, FeedbackRow[]>()
  for (const row of feedback) {
    const arr = feedbackByStudent.get(row.student_id) ?? []
    arr.push(row)
    feedbackByStudent.set(row.student_id, arr)
  }

  const totalTimeSeconds = stats.reduce((acc, row) => acc + (row.total_time_seconds ?? 0), 0)
  const totalHours = (totalTimeSeconds / 3600).toFixed(1)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold tracking-tight">Panel de padres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bienvenido{fullName ? `, ${fullName}` : ""}. Aqui tienes la informacion academica disponible de tus hijos.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Hijos vinculados</p>
          <p className="mt-2 text-2xl font-bold">{studentIds.length}</p>
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
          const recentFeedback = (feedbackByStudent.get(link.student_id) ?? []).slice(0, 3)
          const institution = institutionById.get(link.institution_id)
          const timeSeconds = studentStats.reduce((acc, row) => acc + (row.total_time_seconds ?? 0), 0)
          const lastUpdate = studentStats.reduce<string | null>((latest, row) => {
            if (!row.last_updated_at) return latest
            return !latest || row.last_updated_at > latest ? row.last_updated_at : latest
          }, null)
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
                      {institution?.name ?? "Institucion"} {link.relationship ? `- ${link.relationship}` : ""}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
                  {Math.round(timeSeconds / 60)} min registrados
                </span>
              </div>

              <div className="mt-4 rounded-lg border p-3">
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
                            {teacherName} - {formatDateTime(f.created_at)}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Ultima actualizacion: {formatDateTime(lastUpdate)}{" "}
                {classroomLabels.length > 0 ? `- Aulas: ${classroomLabels.join(", ")}` : ""}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
