import { createClient } from "@/utils/supabase/server"
import AdminDashboardClient from "./dashboard-client"
import { requireInstitution } from "@/lib/institution"


// Server component - fetch all data
async function getAdminStats(institutionId: string) {
  const supabase = await createClient()

  const [
    studentsResult,
    classroomsResult,
    institutionsResult,
    recentExercisesResult
  ] = await Promise.all([
    // Total active students
    supabase
      .from("edu_institution_members")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("active", true)
      .eq("institution_id", institutionId),

    // Total active classrooms
    supabase
      .from("edu_classrooms")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .eq("institution_id", institutionId),

    // Total institutions
    supabase
      .from("edu_institutions")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .eq("id", institutionId),

    // Recent student exercises (last 7 days)
    supabase
      .from("edu_student_exercises")
      .select("id, correct, created_at, edu_classrooms!inner ( institution_id )")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq("edu_classrooms.institution_id", institutionId)
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
    recentExercises: totalExercises,
    accuracy,
  }
}

async function getRecentClassrooms(institutionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("edu_classrooms")
    .select(`
      id,
      grade,
      section,
      academic_year,
      active,
      edu_institutions ( name )
    `)
    .eq("active", true)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .limit(5)

  return data || []
}

async function getRecentStudents(institutionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("edu_institution_members")
    .select(`
      id,
      created_at,
      edu_profiles ( id, first_name, last_name )
    `)
    .eq("role", "student")
    .eq("active", true)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .limit(5)

  return (data || []).map((m: any) => ({
    id: m.edu_profiles?.id,
    first_name: m.edu_profiles?.first_name,
    last_name: m.edu_profiles?.last_name,
    created_at: m.created_at,
    full_name: `${m.edu_profiles?.first_name || ""} ${m.edu_profiles?.last_name || ""}`.trim(),
  }))
}

export default async function AdminDashboard() {
  const institution = await requireInstitution()
  const [stats, recentClassrooms, recentStudents] = await Promise.all([
    getAdminStats(institution.id),
    getRecentClassrooms(institution.id),
    getRecentStudents(institution.id),
  ])

  return (
    <AdminDashboardClient
      stats={stats}
      recentClassrooms={recentClassrooms}
      recentStudents={recentStudents}
    />
  )
}
