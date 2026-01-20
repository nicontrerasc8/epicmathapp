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
    .from("edu_institution_members")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", classroomId)
    .eq("institution_id", institutionId)
    .eq("active", true)

  const { count: exercisesCount } = await supabase
    .from("edu_exercise_assignments")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", classroomId)
    .eq("active", true)

  const { data: recentExercises } = await supabase
    .from("edu_student_exercises")
    .select("id, correct")
    .eq("classroom_id", classroomId)
    .gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    )
    .limit(200)

  const totalExercises = recentExercises?.length ?? 0
  const correctExercises =
    recentExercises?.filter((e) => e.correct).length ?? 0

  const accuracy =
    totalExercises > 0
      ? Math.round((correctExercises / totalExercises) * 100)
      : 0

  return {
    ...safeClassroom,
    memberCount: memberCount ?? 0,
    exercisesCount: exercisesCount ?? 0,
    accuracy,
    totalExercises,
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
