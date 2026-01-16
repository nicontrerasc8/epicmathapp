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
  const { count: temaCount } = await supabase
    .from("edu_classroom_temas")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", id)
    .eq("institution_id", institution.id)
    .eq("active", true)

  // Calculate active students
  const { data: students } = await supabase
    .from("edu_institution_members")
    .select("active")
    .eq("classroom_id", id)
    .eq("institution_id", institution.id)
    .eq("role", "student")

  const activeStudents = students?.filter(s => s.active).length || 0
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
        temaCount: temaCount || 0,
      }}
    />
  )
}
