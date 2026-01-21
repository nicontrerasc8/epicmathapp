import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import TeacherClassroomHubClient from "./classroom-hub-client"
import { requireInstitution } from "@/lib/institution"

export default async function TeacherClassroomHub({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const institution = await requireInstitution()
  const supabase = await createClient()

  // Fetch classroom details
  const { data: classroom } = await supabase
    .from("edu_classrooms")
    .select(`
      id, grade, section, academic_year, active,
      edu_institutions ( name )
    `)
    .eq("id", id)
    .eq("institution_id", institution.id)
    .single()

  if (!classroom) notFound()

  // Fetch stats
  const { count: exerciseCount } = await supabase
    .from("edu_exercise_assignments")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", id)
    .eq("active", true)

  // Calculate active students
  const { data: students } = await supabase
    .from("edu_classroom_members")
    .select(`
      edu_institution_members!inner (
        active,
        role,
        institution_id
      )
    `)
    .eq("classroom_id", id)
    .eq("edu_institution_members.institution_id", institution.id)
    .eq("edu_institution_members.role", "student")

  const activeStudents = (students ?? []).filter((row: any) => {
    const member = Array.isArray(row.edu_institution_members)
      ? row.edu_institution_members[0]
      : row.edu_institution_members
    return Boolean(member?.active)
  }).length
  const studentCount = students?.length || 0

  return (
    <TeacherClassroomHubClient
      classroom={{
        ...classroom,
        institution: Array.isArray(classroom.edu_institutions)
          ? classroom.edu_institutions[0]
          : classroom.edu_institutions!
      }}
      stats={{
        studentCount,
        activeStudents,
        exerciseCount: exerciseCount || 0,
      }}
    />
  )
}
