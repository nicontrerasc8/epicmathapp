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
    .from("edu_classroom_members")
    .select(`
      classroom_id,
      edu_classrooms ( id, grade, section, academic_year ),
      edu_institution_members!inner (
        institution_id,
        role,
        active,
        profile_id,
        edu_institutions:institution_id ( id, name, type )
      )
    `)
    .eq("edu_institution_members.profile_id", user.id)
    .eq("edu_institution_members.institution_id", institution.id)
    .eq("edu_institution_members.role", "teacher")
    .eq("edu_institution_members.active", true)

  const rows = (data ?? []) as any[]

  const classrooms = rows
    .map((m) => {
      const c = Array.isArray(m.edu_classrooms) ? m.edu_classrooms[0] : m.edu_classrooms
      if (!c) return null

      const member = Array.isArray(m.edu_institution_members)
        ? m.edu_institution_members[0]
        : m.edu_institution_members

      const gradeLabel = `${c.grade}${c.section ? ` ${c.section}` : ""}`.trim()
      const institutionName = Array.isArray(member?.edu_institutions)
        ? member?.edu_institutions[0]?.name
        : member?.edu_institutions?.name ?? "Institución"

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
