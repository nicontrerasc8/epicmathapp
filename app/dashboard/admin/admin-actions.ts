"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { requireInstitution } from "@/lib/institution"

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const allowedClassroomGrades = new Set([
    "1-Primaria",
    "2-Primaria",
    "3-Primaria",
    "4-Primaria",
    "5-Primaria",
    "6-Primaria",
    "1-Secundaria",
    "2-Secundaria",
    "3-Secundaria",
    "4-Secundaria",
    "5-Secundaria",
])

const normalizeInstitutionCode = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "")

const buildClassroomCode = (input: {
    institutionCode: string
    grade: string
    section?: string | null
    academicYear: number
}) => {
    const [gradeNumber, levelName] = input.grade.split("-")
    const levelCode = levelName === "Primaria" ? "PRI" : "SEC"
    const section = input.section?.trim().toUpperCase() || ""
    return `${input.institutionCode}-${levelCode}-${gradeNumber}${section}-${input.academicYear}`
}

const getInstitutionCode = async (
    supabase: Awaited<ReturnType<typeof createClient>>,
    institutionId: string,
) => {
    const { data, error } = await supabase
        .from("edu_institutions")
        .select("code, name")
        .eq("id", institutionId)
        .single()
    if (error || !data) {
        throw new Error(error?.message || "Institucion no encontrada")
    }

    const raw = (data.code || data.name || "INST").trim()
    const normalized = normalizeInstitutionCode(raw)
    return normalized || "INST"
}

const getInstitutionId = async () => {
    const institution = await requireInstitution()
    return institution.id
}

// -----------------------------------------------------------------------------
// USERS ACTIONS
// -----------------------------------------------------------------------------

export async function listStudentsAction(
    q: string,
    role?: "student" | "teacher" | "all",
) {
    const supabase = await createClient()
    const institutionId = await getInstitutionId()

    // Nota: filtramos por global_role para velocidad.
    const roles = role && role !== "all"
        ? [role]
        : ["student", "teacher"]
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
                    section
                )
            )
        `)
        .in("global_role", roles)
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
                const grade = m.edu_classrooms?.grade || ""
                const section = m.edu_classrooms?.section || ""
                return `${inst} ${grade} ${section}`.trim()
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
                section
            )
        `)
        .eq("profile_id", studentId)
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
    if (mErr) throw new Error(mErr.message)

    if (!memberships || memberships.length === 0) {
        throw new Error("Usuario fuera de la institucion")
    }

    return { profile, memberships }
}

export async function createStudentAction(input: {
    email: string
    password?: string
    first_name: string
    last_name: string
    role?: "student" | "teacher"
    classroom_id?: string | null
}) {
    const institutionId = await getInstitutionId()
    const email = input.email.trim().toLowerCase()
    if (!email) throw new Error("Correo invalido")
    if (!input.first_name.trim() || !input.last_name.trim()) {
        throw new Error("Nombre y apellido son requeridos")
    }
    const role = input.role ?? "student"
    if (role !== "student" && role !== "teacher") {
        throw new Error("Rol invalido")
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
        global_role: role,
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
    }

    const { error: memberErr } = await supabaseAdmin.from("edu_institution_members").insert({
        profile_id: userId,
        institution_id: institutionId,
        classroom_id: input.classroom_id ?? null,
        role,
        active: true,
    })
    if (memberErr) throw new Error(memberErr.message)

    return { id: userId, password: input.password?.trim() ? null : password }
}

export async function updateStudentAction(
    studentId: string,
    input: {
        first_name: string
        last_name: string
        classroom_id?: string | null
        active: boolean
        role?: "student" | "teacher"
    },
) {
    const institutionId = await getInstitutionId()
    if (!studentId) throw new Error("Usuario invalido")
    if (!input.first_name.trim() || !input.last_name.trim()) {
        throw new Error("Nombre y apellido son requeridos")
    }

    const { data: currentProfile } = await supabaseAdmin
        .from("edu_profiles")
        .select("global_role")
        .eq("id", studentId)
        .maybeSingle()

    const effectiveRole = input.role ?? currentProfile?.global_role ?? "student"
    if (effectiveRole !== "student" && effectiveRole !== "teacher") {
        throw new Error("Rol invalido")
    }

    const { error: profileErr } = await supabaseAdmin
        .from("edu_profiles")
        .update({
            first_name: input.first_name.trim(),
            last_name: input.last_name.trim(),
            active: input.active,
            global_role: effectiveRole,
        })
        .eq("id", studentId)
    if (profileErr) throw new Error(profileErr.message)

    if (!input.classroom_id) {
        const { data: member, error: memberErr } = await supabaseAdmin
            .from("edu_institution_members")
            .select("id")
            .eq("profile_id", studentId)
            .eq("institution_id", institutionId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        if (memberErr) throw new Error(memberErr.message)

        if (member?.id) {
            const { error: clearErr } = await supabaseAdmin
                .from("edu_institution_members")
                .update({
                    classroom_id: null,
                    active: input.active,
                    role: effectiveRole,
                })
                .eq("id", member.id)
            if (clearErr) throw new Error(clearErr.message)
            return { id: studentId }
        }

        const { error: insertErr } = await supabaseAdmin
            .from("edu_institution_members")
            .insert({
                profile_id: studentId,
                institution_id: institutionId,
                classroom_id: null,
                role: effectiveRole,
                active: input.active,
            })
        if (insertErr) throw new Error(insertErr.message)
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
                role: effectiveRole,
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
                role: effectiveRole,
                active: input.active,
            })
        if (insertErr) throw new Error(insertErr.message)
    }

    return { id: studentId }
}

export async function deactivateStudentAction(studentId: string) {
    const institutionId = await getInstitutionId()
    if (!studentId) throw new Error("Usuario invalido")

    const { error: profileErr } = await supabaseAdmin
        .from("edu_profiles")
        .update({ active: false })
        .eq("id", studentId)
    if (profileErr) throw new Error(profileErr.message)

    const { error: memberErr } = await supabaseAdmin
        .from("edu_institution_members")
        .update({ active: false })
        .eq("profile_id", studentId)
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
      section,
      academic_year,
      active,
      institution_id,
      classroom_code,
      created_at,
      edu_institutions (
        id,
        name,
        slug
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


export async function createClassroomAction(input: {
    institution_id: string
    grade: string
    section?: string | null
    academic_year: number
    classroom_code?: string | null
    active: boolean
}) {
    const supabase = await createClient()
    const institutionId = await getInstitutionId()
    if (input.institution_id !== institutionId) throw new Error("Institucion invalida")
    if (!input.grade.trim()) throw new Error("Grado requerido")

    const grade = input.grade.trim()
    if (!allowedClassroomGrades.has(grade)) throw new Error("Grado invalido")
    const section = input.section?.trim() || null
    const institutionCode = await getInstitutionCode(supabase, institutionId)
    const classroomCode = buildClassroomCode({
        institutionCode,
        grade,
        section,
        academicYear: input.academic_year,
    })
    const payload = {
        institution_id: institutionId,
        grade,
        section,
        academic_year: input.academic_year,
        classroom_code: classroomCode,
        active: input.active,
    }

    let existingQuery = supabase
        .from("edu_classrooms")
        .select("id, active")
        .eq("institution_id", input.institution_id)
        .eq("grade", grade)
        .eq("academic_year", input.academic_year)

    existingQuery = section
        ? existingQuery.eq("section", section)
        : existingQuery.is("section", null)

    const { data: existing, error: existingErr } = await existingQuery
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
        grade: string
        section?: string | null
        academic_year: number
        classroom_code?: string | null
        active: boolean
    },
) {
    if (!classroomId) throw new Error("Aula invalida")
    const supabase = await createClient()
    const institutionId = await getInstitutionId()
    if (input.institution_id !== institutionId) throw new Error("Institucion invalida")
    if (!input.grade.trim()) throw new Error("Grado requerido")

    const grade = input.grade.trim()
    if (!allowedClassroomGrades.has(grade)) throw new Error("Grado invalido")
    const institutionCode = await getInstitutionCode(supabase, institutionId)
    const classroomCode = buildClassroomCode({
        institutionCode,
        grade,
        section: input.section,
        academicYear: input.academic_year,
    })
    const payload = {
        institution_id: institutionId,
        grade,
        section: input.section?.trim() || null,
        academic_year: input.academic_year,
        classroom_code: classroomCode,
        active: input.active,
    }

    const { error } = await supabase
        .from("edu_classrooms")
        .update(payload)
        .eq("id", classroomId)
        .eq("institution_id", institutionId)
        .select("id")
        .single()

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
