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
      const password =
        row.password || crypto.randomBytes(6).toString("hex")

      // 1️⃣ Crear Auth user
      const { data: auth, error: authErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: row.email,
          password,
          email_confirm: true,
        })

      if (authErr || !auth.user) throw authErr

      const userId = auth.user.id

      // 2️⃣ Perfil
      await supabaseAdmin.from("edu_profiles").insert({
        id: userId,
        first_name: row.first_name,
        last_name: row.last_name,
        global_role: row.role,
      })

      // 3️⃣ Membresía
      await supabaseAdmin.from("edu_institution_members").insert({
        profile_id: userId,
        institution_id: row.institution_id,
        classroom_id: row.classroom_id ?? null,
        role: row.role,
      })

      report.created.push({
        email: row.email,
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
