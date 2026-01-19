"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { requireInstitution } from "@/lib/institution"

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const getInstitutionId = async () => {
    const institution = await requireInstitution()
    return institution.id
}

// -----------------------------------------------------------------------------
// STUDENTS ACTIONS
// -----------------------------------------------------------------------------

export async function listStudentsAction(q: string) {
    const supabase = await createClient()
    const institutionId = await getInstitutionId()

    // Nota: asumimos estudiantes por:
    // - global_role = 'student' OR
    // - membresía role='student'
    // Aquí usamos global_role para velocidad (puedes ampliar luego).
    const query = supabase
        .from("edu_profiles")
        .select(`
            id,
            first_name,
            last_name,
            global_role,
            active,
            created_at,
            edu_institution_members!inner (
                id,
                role,
                active,
                institution_id,
                classroom_id,
                edu_institutions ( id, name ),
                edu_classrooms (
                    id,
                    academic_year,
                    grade,
                    grade_id,
                    edu_institution_grades ( name, code )
                )
            )
        `)
        .eq("global_role", "student")
        .eq("edu_institution_members.institution_id", institutionId)
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
    return rows.filter((r: any) => {
        const membershipText = (r.edu_institution_members || [])
            .map((m: any) => {
                const inst = m.edu_institutions?.name || ""
                const grade = m.edu_classrooms?.edu_institution_grades?.name ||
                    m.edu_classrooms?.edu_institution_grades?.code ||
                    m.edu_classrooms?.grade ||
                    ""
                return `${inst} ${grade}`.trim()
            })
            .join(" ")
            .toLowerCase()

        return (r.full_name || "").toLowerCase().includes(needle) ||
            (r.id || "").toLowerCase().includes(needle) ||
            membershipText.includes(needle)
    })
}

export async function getStudentDetailAction(studentId: string) {
    const supabase = await createClient()
    const institutionId = await getInstitutionId()

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
            classroom_id,
            active,
            created_at,
            edu_institutions ( id, name ),
            edu_classrooms (
                id,
                academic_year,
                grade,
                grade_id,
                edu_institution_grades ( name, code )
            )
        `)
        .eq("profile_id", studentId)
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
    if (mErr) throw new Error(mErr.message)

    if (!memberships || memberships.length === 0) {
        throw new Error("Estudiante fuera de la institucion")
    }

    return { profile, memberships }
}

export async function createStudentAction(input: {
    email: string
    password?: string
    first_name: string
    last_name: string
    classroom_id?: string | null
}) {
    const institutionId = await getInstitutionId()
    const email = input.email.trim().toLowerCase()
    if (!email) throw new Error("Correo invalido")
    if (!input.first_name.trim() || !input.last_name.trim()) {
        throw new Error("Nombre y apellido son requeridos")
    }

    const password = input.password?.trim() || crypto.randomBytes(6).toString("hex")

    const { data: auth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    })
    if (authErr || !auth.user) throw new Error(authErr?.message || "Error creando usuario")

    const userId = auth.user.id

    const { error: profileErr } = await supabaseAdmin.from("edu_profiles").insert({
        id: userId,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        global_role: "student",
        active: true,
    })
    if (profileErr) throw new Error(profileErr.message)

    if (input.classroom_id) {
        const { data: classroom, error: classroomErr } = await supabaseAdmin
            .from("edu_classrooms")
            .select("id, institution_id")
            .eq("id", input.classroom_id)
            .single()
        if (classroomErr || !classroom) {
            throw new Error(classroomErr?.message || "Aula no encontrada")
        }
        if (classroom.institution_id !== institutionId) {
            throw new Error("Aula fuera de la institucion")
        }

        const { error: memberErr } = await supabaseAdmin.from("edu_institution_members").insert({
            profile_id: userId,
            institution_id: classroom.institution_id,
            classroom_id: input.classroom_id,
            role: "student",
            active: true,
        })
        if (memberErr) throw new Error(memberErr.message)
    }

    return { id: userId, password: input.password?.trim() ? null : password }
}

export async function updateStudentAction(
    studentId: string,
    input: {
        first_name: string
        last_name: string
        classroom_id?: string | null
        active: boolean
    },
) {
    const institutionId = await getInstitutionId()
    if (!studentId) throw new Error("Estudiante invalido")
    if (!input.first_name.trim() || !input.last_name.trim()) {
        throw new Error("Nombre y apellido son requeridos")
    }

    const { error: profileErr } = await supabaseAdmin
        .from("edu_profiles")
        .update({
            first_name: input.first_name.trim(),
            last_name: input.last_name.trim(),
            active: input.active,
        })
        .eq("id", studentId)
    if (profileErr) throw new Error(profileErr.message)

    if (!input.classroom_id) {
        const { error: clearErr } = await supabaseAdmin
            .from("edu_institution_members")
            .update({ classroom_id: null })
            .eq("profile_id", studentId)
            .eq("role", "student")
            .eq("institution_id", institutionId)
        if (clearErr) throw new Error(clearErr.message)
        return { id: studentId }
    }

    const { data: classroom, error: classroomErr } = await supabaseAdmin
        .from("edu_classrooms")
        .select("id, institution_id")
        .eq("id", input.classroom_id)
        .single()
    if (classroomErr || !classroom) {
        throw new Error(classroomErr?.message || "Aula no encontrada")
    }
    if (classroom.institution_id !== institutionId) {
        throw new Error("Aula fuera de la institucion")
    }

    const { data: member, error: memberErr } = await supabaseAdmin
        .from("edu_institution_members")
        .select("id")
        .eq("profile_id", studentId)
        .eq("role", "student")
        .eq("institution_id", institutionId)
        .limit(1)
        .maybeSingle()
    if (memberErr) throw new Error(memberErr.message)

    if (member?.id) {
        const { error: updateErr } = await supabaseAdmin
            .from("edu_institution_members")
            .update({
                institution_id: classroom.institution_id,
                classroom_id: input.classroom_id,
                active: input.active,
            })
            .eq("id", member.id)
        if (updateErr) throw new Error(updateErr.message)
    } else {
        const { error: insertErr } = await supabaseAdmin
            .from("edu_institution_members")
            .insert({
                profile_id: studentId,
                institution_id: classroom.institution_id,
                classroom_id: input.classroom_id,
                role: "student",
                active: input.active,
            })
        if (insertErr) throw new Error(insertErr.message)
    }

    return { id: studentId }
}

export async function deactivateStudentAction(studentId: string) {
    const institutionId = await getInstitutionId()
    if (!studentId) throw new Error("Estudiante invalido")

    const { error: profileErr } = await supabaseAdmin
        .from("edu_profiles")
        .update({ active: false })
        .eq("id", studentId)
    if (profileErr) throw new Error(profileErr.message)

    const { error: memberErr } = await supabaseAdmin
        .from("edu_institution_members")
        .update({ active: false })
        .eq("profile_id", studentId)
        .eq("role", "student")
        .eq("institution_id", institutionId)
    if (memberErr) throw new Error(memberErr.message)

    return { id: studentId }
}

// -----------------------------------------------------------------------------
// CLASSROOMS ACTIONS
// -----------------------------------------------------------------------------

export async function listClassroomsAction() {
    const supabase = await createClient()
    const institutionId = await getInstitutionId()

    const { data, error } = await supabase
        .from("edu_classrooms")
        .select(`
      id,
      grade,
      grade_id,
      academic_year,
      active,
      institution_id,
      created_at,
      edu_institutions (
        id,
        name
      ),
      edu_institution_grades (
        id,
        name,
        level,
        grade_num,
        code
      )
    `)
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function listInstitutionsAction() {
    const supabase = await createClient()
    const institutionId = await getInstitutionId()

    const { data, error } = await supabase
        .from("edu_institutions")
        .select("id, name, type, code, active")
        .eq("id", institutionId)
        .order("name", { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
}

export async function createInstitutionAction(input: {
    name: string
    type: "academia" | "colegio" | "universidad"
    region?: string | null
    code?: string | null
    slug?: string | null
    domain?: string | null
    logo_url?: string | null
    active: boolean
}) {
    if (!input.name.trim()) throw new Error("Nombre requerido")
    if (!input.type) throw new Error("Tipo requerido")

    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_institutions")
        .insert({
            name: input.name.trim(),
            type: input.type,
            region: input.region?.trim() || null,
            code: input.code?.trim() || null,
            slug: input.slug?.trim() || null,
            domain: input.domain?.trim() || null,
            logo_url: input.logo_url?.trim() || null,
            active: input.active,
        })
        .select("id, name, type, region, active, created_at, code, slug, domain, logo_url")
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function updateInstitutionAction(
    institutionId: string,
    input: {
        name: string
        type: "academia" | "colegio" | "universidad"
        region?: string | null
        code?: string | null
        slug?: string | null
        domain?: string | null
        logo_url?: string | null
        active: boolean
    },
) {
    if (!input.name.trim()) throw new Error("Nombre requerido")
    if (!input.type) throw new Error("Tipo requerido")

    const supabase = await createClient()
    const { error } = await supabase
        .from("edu_institutions")
        .update({
            name: input.name.trim(),
            type: input.type,
            region: input.region?.trim() || null,
            code: input.code?.trim() || null,
            slug: input.slug?.trim() || null,
            domain: input.domain?.trim() || null,
            logo_url: input.logo_url?.trim() || null,
            active: input.active,
        })
        .eq("id", institutionId)

    if (error) throw new Error(error.message)
    return { id: institutionId }
}

export async function listInstitutionGradesAction(institutionId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("edu_institution_grades")
        .select("id, institution_id, name, code, level, grade_num, ordering, active")
        .eq("institution_id", institutionId)
        .eq("active", true)
        .order("ordering", { ascending: true })
        .order("grade_num", { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
}

export async function createInstitutionGradeAction(input: {
    institution_id: string
    name: string
    code?: string | null
    level: "inicial" | "primaria" | "secundaria"
    grade_num: number
    ordering?: number | null
    active?: boolean
}) {
    if (!input.institution_id) throw new Error("Institucion requerida")
    if (!input.name.trim()) throw new Error("Nombre requerido")
    if (!Number.isFinite(input.grade_num) || input.grade_num <= 0) {
        throw new Error("Numero de grado invalido")
    }

    const supabase = await createClient()
    const { data: institution, error: instErr } = await supabase
        .from("edu_institutions")
        .select("id")
        .eq("id", input.institution_id)
        .single()
    if (instErr || !institution) {
        throw new Error(instErr?.message || "Institucion no encontrada")
    }

    const { data, error } = await supabase
        .from("edu_institution_grades")
        .insert({
            institution_id: input.institution_id,
            name: input.name.trim(),
            code: input.code?.trim() || null,
            level: input.level,
            grade_num: input.grade_num,
            ordering: input.ordering ?? null,
            active: input.active ?? true,
        })
        .select("id, institution_id, name, code, level, grade_num, ordering, active")
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function updateInstitutionGradeAction(
    gradeId: string,
    input: {
        institution_id: string
        name: string
        code?: string | null
        level: "inicial" | "primaria" | "secundaria"
        grade_num: number
        ordering?: number | null
        active: boolean
    },
) {
    if (!gradeId) throw new Error("Grado invalido")
    if (!input.name.trim()) throw new Error("Nombre requerido")
    if (!Number.isFinite(input.grade_num) || input.grade_num <= 0) {
        throw new Error("Numero de grado invalido")
    }

    const supabase = await createClient()
    const { data: grade, error: gradeErr } = await supabase
        .from("edu_institution_grades")
        .select("id, institution_id")
        .eq("id", gradeId)
        .single()
    if (gradeErr || !grade) throw new Error(gradeErr?.message || "Grado no encontrado")
    if (grade.institution_id !== input.institution_id) {
        throw new Error("El grado no pertenece a la institucion seleccionada")
    }

    const { error } = await supabase
        .from("edu_institution_grades")
        .update({
            name: input.name.trim(),
            code: input.code?.trim() || null,
            level: input.level,
            grade_num: input.grade_num,
            ordering: input.ordering ?? null,
            active: input.active,
        })
        .eq("id", gradeId)

    if (error) throw new Error(error.message)
    return { id: gradeId }
}

export async function deactivateInstitutionGradeAction(gradeId: string) {
    if (!gradeId) throw new Error("Grado invalido")
    const supabase = await createClient()

    const { error } = await supabase
        .from("edu_institution_grades")
        .update({ active: false })
        .eq("id", gradeId)

    if (error) throw new Error(error.message)
    return { id: gradeId }
}

export async function createClassroomAction(input: {
    institution_id: string
    grade_id: string
    academic_year: number
    active: boolean
}) {
    const supabase = await createClient()

    const { data: grade, error: gradeErr } = await supabase
        .from("edu_institution_grades")
        .select("id, name, code, institution_id")
        .eq("id", input.grade_id)
        .single()
    if (gradeErr || !grade) throw new Error(gradeErr?.message || "Grado no encontrado")
    if (grade.institution_id !== input.institution_id) {
        throw new Error("El grado no pertenece a la institucion seleccionada")
    }

    const payload = {
        institution_id: input.institution_id,
        grade_id: input.grade_id,
        academic_year: input.academic_year,
        active: input.active,
        grade: grade.name || grade.code || "",
    }

    const { data: existing, error: existingErr } = await supabase
        .from("edu_classrooms")
        .select("id, active")
        .eq("institution_id", input.institution_id)
        .eq("grade_id", input.grade_id)
        .eq("academic_year", input.academic_year)
        .limit(1)
        .maybeSingle()
    if (existingErr) throw new Error(existingErr.message)

    if (existing?.id) {
        if (existing.active) {
            throw new Error("Ya existe un aula activa con esos datos")
        }

        const { error: reactivateErr } = await supabase
            .from("edu_classrooms")
            .update({ ...payload, active: true })
            .eq("id", existing.id)
        if (reactivateErr) throw new Error(reactivateErr.message)
        return { id: existing.id }
    }

    const { data, error } = await supabase
        .from("edu_classrooms")
        .insert(payload)
        .select("id")
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function updateClassroomAction(
    classroomId: string,
    input: {
        institution_id: string
        grade_id: string
        academic_year: number
        active: boolean
    },
) {
    if (!classroomId) throw new Error("Aula invalida")
    const supabase = await createClient()

    const { data: grade, error: gradeErr } = await supabase
        .from("edu_institution_grades")
        .select("id, name, code, institution_id")
        .eq("id", input.grade_id)
        .single()
    if (gradeErr || !grade) throw new Error(gradeErr?.message || "Grado no encontrado")
    if (grade.institution_id !== input.institution_id) {
        throw new Error("El grado no pertenece a la institucion seleccionada")
    }

    const payload = {
        institution_id: input.institution_id,
        grade_id: input.grade_id,
        academic_year: input.academic_year,
        active: input.active,
        grade: grade.name || grade.code || "",
    }

    const { error } = await supabase
        .from("edu_classrooms")
        .update(payload)
        .eq("id", classroomId)

    if (error) throw new Error(error.message)
    return { id: classroomId }
}

export async function deactivateClassroomAction(classroomId: string) {
    if (!classroomId) throw new Error("Aula invalida")
    const supabase = await createClient()

    const { data: classroom, error: classroomErr } = await supabase
        .from("edu_classrooms")
        .select("id, institution_id")
        .eq("id", classroomId)
        .single()
    if (classroomErr || !classroom) {
        throw new Error(classroomErr?.message || "Aula no encontrada")
    }

    const { error } = await supabase
        .from("edu_classrooms")
        .update({ active: false })
        .eq("id", classroomId)

    if (error) throw new Error(error.message)
    return { id: classroomId }
}
