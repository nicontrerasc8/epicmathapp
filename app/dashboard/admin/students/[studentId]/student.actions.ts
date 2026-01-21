"use server"

import { createClient } from "@/utils/supabase/server"
import { requireInstitution } from "@/lib/institution"

export async function getStudentDetailAction(studentId: string) {
  const supabase = await createClient()
  const institution = await requireInstitution()

  const { data: profile, error: pErr } = await supabase
    .from("edu_profiles")
    .select("id, first_name, last_name, global_role, active, created_at")
    .eq("id", studentId)
    .single()
  if (pErr) throw new Error(pErr.message)

  const { data: memberships, error: mErr } = await supabase
    .from("edu_institution_members")
    .select(`
      id,
      role,
      institution_id,
      active,
      created_at,
      edu_classroom_members (
        classroom_id,
        edu_classrooms ( id, academic_year, grade, section )
      )
    `)
    .eq("profile_id", studentId)
    .eq("institution_id", institution.id)
    .order("created_at", { ascending: false })
  if (mErr) throw new Error(mErr.message)

  return { profile, memberships }
}
