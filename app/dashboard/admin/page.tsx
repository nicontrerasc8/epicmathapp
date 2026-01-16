import { createClient } from "@/utils/supabase/server"
import AdminDashboardClient from "./dashboard-client"


// Server component - fetch all data
async function getAdminStats() {
  const supabase = await createClient()

  const [
    studentsResult,
    classroomsResult,
    institutionsResult,
    temasResult,
    recentExercisesResult
  ] = await Promise.all([
    // Total active students
    supabase
      .from("edu_profiles")
      .select("id", { count: "exact", head: true })
      .eq("global_role", "student")
      .eq("active", true),

    // Total active classrooms
    supabase
      .from("edu_classrooms")
      .select("id", { count: "exact", head: true })
      .eq("active", true),

    // Total institutions
    supabase
      .from("edu_institutions")
      .select("id", { count: "exact", head: true })
      .eq("active", true),

    // Total temas assigned
    supabase
      .from("edu_classroom_temas")
      .select("id", { count: "exact", head: true })
      .eq("active", true),

    // Recent student exercises (last 7 days)
    supabase
      .from("edu_student_exercises")
      .select("id, correct, created_at")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  // Calculate accuracy from recent exercises
  const exercises = recentExercisesResult.data || []
  const totalExercises = exercises.length
  const correctExercises = exercises.filter((e) => e.correct).length
  const accuracy = totalExercises > 0
    ? Math.round((correctExercises / totalExercises) * 100)
    : 0

  return {
    students: studentsResult.count || 0,
    classrooms: classroomsResult.count || 0,
    institutions: institutionsResult.count || 0,
    temas: temasResult.count || 0,
    recentExercises: totalExercises,
    accuracy,
  }
}

async function getRecentClassrooms() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("edu_classrooms")
    .select(`
      id,
      grade,
      section,
      grade_id,
      section_id,
      academic_year,
      active,
      edu_institutions ( name ),
      edu_institution_grades ( name, code ),
      edu_grade_sections ( name, code )
    `)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5)

  return data || []
}

async function getRecentStudents() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("edu_profiles")
    .select("id, first_name, last_name, created_at")
    .eq("global_role", "student")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5)

  return (data || []).map((s) => ({
    ...s,
    full_name: `${s.first_name} ${s.last_name}`.trim(),
  }))
}

export default async function AdminDashboard() {
  const [stats, recentClassrooms, recentStudents] = await Promise.all([
    getAdminStats(),
    getRecentClassrooms(),
    getRecentStudents(),
  ])

  return (
    <AdminDashboardClient
      stats={stats}
      recentClassrooms={recentClassrooms}
      recentStudents={recentStudents}
    />
  )
}
