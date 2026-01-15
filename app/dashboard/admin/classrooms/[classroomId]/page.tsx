import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import ClassroomDetailClient from "./classroom-detail-client"

// Server component - fetch classroom data
async function getClassroomData(classroomId: string) {
  const supabase = await createClient()

  // Fetch classroom info
  const { data: classroom } = await supabase
    .from("edu_classrooms")
    .select(`
      id,
      grade,
      section,
      grade_id,
      section_id,
      academic_year,
      active,
      edu_institutions ( id, name, type ),
      edu_institution_grades ( id, name, level, grade_num, code ),
      edu_grade_sections ( id, name, code )
    `)
    .eq("id", classroomId)
    .single()

  if (!classroom) return null

  // Get member count
  const { count: memberCount } = await supabase
    .from("edu_institution_members")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", classroomId)
    .eq("active", true)

  // Get temas count
  const { count: temasCount } = await supabase
    .from("edu_classroom_temas")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", classroomId)
    .eq("active", true)

  // Get exercises count
  const { count: exercisesCount } = await supabase
    .from("edu_classroom_tema_exercises")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", classroomId)
    .eq("active", true)

  // Get recent student exercises for accuracy
  const { data: recentExercises } = await supabase
    .from("edu_student_exercises")
    .select("id, correct")
    .eq("classroom_id", classroomId)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(200)

  const totalExercises = recentExercises?.length || 0
  const correctExercises = recentExercises?.filter((e) => e.correct).length || 0
  const accuracy = totalExercises > 0
    ? Math.round((correctExercises / totalExercises) * 100)
    : 0

  return {
    ...classroom,
    memberCount: memberCount || 0,
    temasCount: temasCount || 0,
    exercisesCount: exercisesCount || 0,
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
  const data = await getClassroomData(classroomId)

  if (!data) {
    notFound()
  }

  return <ClassroomDetailClient data={data} />
}
