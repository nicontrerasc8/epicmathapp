import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import ClassroomDetailClient from "./classroom-detail-client"
import { requireInstitution } from "@/lib/institution"
// Server component - fetch classroom data
async function getClassroomData(classroomId: string, institutionId: string) {
  const supabase = await createClient()

  const { data: classroom } = await supabase
    .from("edu_classrooms")
    .select(`
      id,
      grade,
      section,
      academic_year,
      active,
      classroom_code,
      edu_institutions ( id, name, type )
    `)
    .eq("id", classroomId)
    .eq("institution_id", institutionId)
    .single()

  if (!classroom) return null

  const safeClassroom = classroom

  const { count: memberCount } = await supabase
    .from("edu_classroom_members")
    .select("edu_institution_members!inner ( id )", { count: "exact", head: true })
    .eq("classroom_id", classroomId)
    .eq("edu_institution_members.institution_id", institutionId)
    .eq("edu_institution_members.active", true)

  return {
    ...safeClassroom,
    memberCount: memberCount ?? 0,
  }
}


export default async function ClassroomSummary({
  params,
}: {
  params: Promise<{ classroomId: string }>
}) {
  const { classroomId } = await params
  const institution = await requireInstitution()
  const data = await getClassroomData(classroomId, institution.id)

  if (!data) {
    notFound()
  }

  return <ClassroomDetailClient data={data} />
}
