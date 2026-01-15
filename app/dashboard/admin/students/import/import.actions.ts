"use server"

import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

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
}

export async function importUsersAction(rows: Row[]) {
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
      })
      if (profileErr) throw profileErr

      // 3️⃣ Membresía
      const { error: memberErr } = await supabaseAdmin.from("edu_institution_members").insert({
        profile_id: userId,
        institution_id: institutionId,
        classroom_id: row.classroom_id ?? null,
        role,
      })
      if (memberErr) throw memberErr

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
