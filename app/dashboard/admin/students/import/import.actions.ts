"use server"

import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { requireInstitution } from "@/lib/institution"
import { ensureParentLinkAction } from "@/app/dashboard/admin/admin-actions"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔥 clave admin
)

type Row = {
  email: string
  password?: string
  first_name: string
  last_name: string
  role: "student" | "teacher"
  institution_id: string
  classroom_id?: string
  parent_first_name?: string
  parent_last_name?: string
}

export async function importUsersAction(rows: Row[]) {
  const institution = await requireInstitution()
  const report:any = {
    created: [],
    failed: [],
  }

  for (const row of rows) {
    try {
      const email = row.email?.trim().toLowerCase()
      const firstName = row.first_name?.trim()
      const lastName = row.last_name?.trim()
      const role = row.role?.trim().toLowerCase() as Row["role"] | undefined
      const institutionId = row.institution_id?.trim()
      const parentFirstName = row.parent_first_name?.trim() || ""
      const parentLastName = row.parent_last_name?.trim() || ""

      if (!email || !firstName || !lastName || !institutionId || !role) {
        report.failed.push({
          email: row.email,
          error: "Campos requeridos faltantes",
        })
        continue
      }

      if (role !== "student" && role !== "teacher") {
        report.failed.push({
          email,
          error: "Role invalido (student o teacher)",
        })
        continue
      }
      if ((parentFirstName || parentLastName) && (!parentFirstName || !parentLastName)) {
        report.failed.push({
          email,
          error: "Padre requerido (nombre y apellido)",
        })
        continue
      }
      if (institutionId !== institution.id) {
        report.failed.push({
          email,
          error: "Institucion invalida",
        })
        continue
      }

      const password = row.password || crypto.randomBytes(6).toString("hex")

      // 1️⃣ Crear Auth user
      const { data: auth, error: authErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })

      if (authErr || !auth.user) throw authErr

      const userId = auth.user.id

      // 2️⃣ Perfil
      const { error: profileErr } = await supabaseAdmin.from("edu_profiles").insert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        global_role: role,
        active: true,
      })
      if (profileErr) throw profileErr

      // 3️⃣ Membresía
      const { data: member, error: memberErr } = await supabaseAdmin
        .from("edu_institution_members")
        .insert({
          profile_id: userId,
          institution_id: institutionId,
          role,
          active: true,
        })
        .select("id")
        .single()
      if (memberErr) throw memberErr

      if (row.classroom_id && member?.id) {
        const { error: cmErr } = await supabaseAdmin
          .from("edu_classroom_members")
          .insert({
            institution_member_id: member.id,
            classroom_id: row.classroom_id,
          })
        if (cmErr) throw cmErr
      }

      if (role === "student" && parentFirstName && parentLastName) {
        await ensureParentLinkAction({
          student_id: userId,
          parent_first_name: parentFirstName,
          parent_last_name: parentLastName,
        })
      }

      report.created.push({
        email,
        password,
      })
    } catch (err: any) {
      report.failed.push({
        email: row.email,
        error: err?.message ?? "Unknown error",
      })
    }
  }

  return report
}
