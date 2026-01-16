import { createClient } from "@/utils/supabase/server"
import TeacherDashboardClient from "./dashboard-client"
import { requireInstitution } from "@/lib/institution"

export default async function TeacherDashboard() {
  const institution = await requireInstitution()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch teacher classrooms
  const { data, error } = await supabase
    .from("edu_institution_members")
    .select(`
      classroom_id,
      institution_id,
      edu_classrooms:classroom_id ( id, grade, section, academic_year ),
      edu_institutions:institution_id ( id, name, type )
    `)
    .eq("profile_id", user.id)
    .eq("institution_id", institution.id)
    .eq("role", "teacher")
    .eq("active", true)

  const rows = (data ?? []) as any[]

  const classrooms = rows
    .map((m) => {
      const c = m.edu_classrooms
      if (!c) return null

      const gradeLabel = `${c.section}`
      const institutionName = Array.isArray(m.edu_institutions)
        ? m.edu_institutions[0]?.name
        : m.edu_institutions?.name ?? "Institución"

      return {
        classroomId: c.id,
        title: gradeLabel,
        subtitle: institutionName,
        gradeLabel,
        institutionName,
        academicYear: c.academic_year,
      }
    })
    .filter((item): item is { classroomId: string; title: string; subtitle: string; gradeLabel: string; institutionName: string; academicYear: number } => Boolean(item))
    .sort((a, b) => {
      if (a.academicYear !== b.academicYear) return b.academicYear - a.academicYear
      return a.title.localeCompare(b.title)
    })

  return <TeacherDashboardClient classrooms={classrooms} />
}
