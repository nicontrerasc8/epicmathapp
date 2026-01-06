"use server"

import { createClient } from "@/utils/supabase/server"

// -----------------------------------------------------------------------------
// STUDENTS ACTIONS
// -----------------------------------------------------------------------------

export async function listStudentsAction(q: string) {
    const supabase = await createClient()

    // Nota: asumimos estudiantes por:
    // - global_role = 'student' OR
    // - membresía role='student'
    // Aquí usamos global_role para velocidad (puedes ampliar luego).
    const query = supabase
        .from("edu_profiles")
        .select("id, first_name, last_name, global_role, active, created_at")
        .eq("global_role", "student")
        .order("created_at", { ascending: false })
        .limit(200)

    if (q?.trim()) {
        // Supabase no soporta ilike multi-col fácil sin RPC, así que hacemos filtro simple client.
        // Igual te retorno todo y filtramos en client (200 máx).
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const rows = (data ?? []).map((r) => ({
        ...r,
        full_name: `${r.first_name} ${r.last_name}`.trim(),
    }))

    if (!q?.trim()) return rows

    const needle = q.trim().toLowerCase()
    return rows.filter((r) =>
        (r.full_name || "").toLowerCase().includes(needle) || (r.id || "").toLowerCase().includes(needle)
    )
}

export async function getStudentDetailAction(studentId: string) {
    const supabase = await createClient()

    const { data: profile, error: pErr } = await supabase
        .from("edu_profiles")
        .select("id, first_name, last_name, global_role, active, created_at")
        .eq("id", studentId)
        .single()
    if (pErr) throw new Error(pErr.message)

    const { data: memberships, error: mErr } = await supabase
        .from("edu_institution_members")
        .select("id, role, institution_id, classroom_id, active, created_at")
        .eq("profile_id", studentId)
        .order("created_at", { ascending: false })
    if (mErr) throw new Error(mErr.message)

    return { profile, memberships }
}

// -----------------------------------------------------------------------------
// CLASSROOMS ACTIONS
// -----------------------------------------------------------------------------

export async function listClassroomsAction() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("edu_classrooms")
        .select(`
      id,
      grade,
      section,
      academic_year,
      active,
      institution_id,
      created_at,
      edu_institutions (
        id,
        name
      )
    `)
        .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)
    return data
}
