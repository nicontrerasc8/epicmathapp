import { createClient } from '@/utils/supabase/client'

export type StudentSessionData = {
  student_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  classroom_id: string | null
  institution_id: string | null
}

export const fetchStudentSession = async (
  institutionId?: string
): Promise<StudentSessionData | null> => {
  console.log('[fetchStudentSession] institutionId requested:', institutionId)
  const supabase = createClient()

  /* ============================
     1. AUTH USER
  ============================ */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log('[fetchStudentSession] auth result:', { user, authError })
  if (authError || !user) {
    console.warn('[fetchStudentSession] No authenticated user')
    return null
  }

  /* ============================
     2. PROFILE (GLOBAL ROLE)
  ============================ */
  const { data: profile, error: profileError } = await supabase
    .from('edu_profiles')
    .select('id, first_name, last_name, global_role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profileError ||
    !profile ||
    profile.active === false ||
    profile.global_role !== 'student'
  ) {
    console.warn('[fetchStudentSession] Invalid or inactive student profile')
    return null
  }

  /* ============================
     3. INSTITUTION MEMBERSHIP
     (THIS IS THE SOURCE OF TRUTH)
  ============================ */
  let memberQuery = supabase
    .from('edu_institution_members')
    .select(`
      id,
      institution_id,
      edu_classroom_members (
        classroom_id,
        edu_classrooms ( id, active )
      )
    `)
    .eq('profile_id', user.id)
    .eq('role', 'student')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (institutionId) {
    memberQuery = memberQuery.eq('institution_id', institutionId)
  }

  const { data: member, error: memberError } =
    await memberQuery.maybeSingle()

  console.log('[fetchStudentSession] membership query result:', { member, memberError })
  if (memberError) {
    console.error('[fetchStudentSession] Membership lookup error:', memberError)
    return null
  }

  if (!member) {
    console.warn('[fetchStudentSession] Student has no institution membership')
  }

  const classroomMemberships = Array.isArray(member?.edu_classroom_members)
    ? member?.edu_classroom_members
    : member?.edu_classroom_members
      ? [member.edu_classroom_members]
      : []

  const activeClassroom =
    classroomMemberships.find((m: any) => m.edu_classrooms?.active !== false) ??
    classroomMemberships[0]

  /* ============================
     4. FINAL SESSION OBJECT
  ============================ */
  return {
    student_id: profile.id,                 // 🔑 PK real del estudiante
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: user.email ?? null,
    classroom_id: activeClassroom?.classroom_id ?? null,
    institution_id: member?.institution_id ?? null,
  }
}
