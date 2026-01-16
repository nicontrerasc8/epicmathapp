import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import AdminShell from "./ui/AdminShell"
import { requireInstitution } from "@/lib/institution"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const institution = await requireInstitution()
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.warn("[Admin Layout] No authenticated user:", userError?.message)
    redirect("/sign-in")
  }

  const { data: me, error: profileError } = await supabase
    .from("edu_profiles")
    .select("id, global_role, active")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("[Admin Layout] Profile lookup error:", profileError)
    redirect("/sign-in")
  }

  if (!me) {
    console.warn(`[Admin Layout] Profile not found for user: ${user.id}`)
    redirect("/sign-in")
  }

  if (!me.active) {
    console.warn(`[Admin Layout] Inactive profile: ${user.id}`)
    redirect("/dashboard")
  }

  if (me.global_role !== "admin") {
    console.warn(`[Admin Layout] Non-admin access attempt: ${me.global_role}`)
    redirect("/dashboard")
  }

  // Admins tienen acceso a cualquier institución (super admin)
  // No verificamos membership para admins

  return <AdminShell>{children}</AdminShell>
}
