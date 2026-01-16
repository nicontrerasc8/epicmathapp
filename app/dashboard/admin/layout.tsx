import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import AdminShell from "./ui/AdminShell"
import { requireInstitution } from "@/lib/institution"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const institution = await requireInstitution()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: me } = await supabase
    .from("edu_profiles")
    .select("id, global_role, active")
    .eq("id", user.id)
    .single()

  if (!me?.active || me.global_role !== "admin") redirect("/dashboard")

  const { data: membership } = await supabase
    .from("edu_institution_members")
    .select("id")
    .eq("profile_id", user.id)
    .eq("institution_id", institution.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle()

  if (!membership) redirect("/sign-in")

  return <AdminShell>{children}</AdminShell>
}
