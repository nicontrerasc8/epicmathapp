import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import AdminShell from "./ui/AdminShell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: me } = await supabase
    .from("edu_profiles")
    .select("id, global_role, active")
    .eq("id", user.id)
    .single()

  if (!me?.active || me.global_role !== "admin") redirect("/dashboard")

  return <AdminShell>{children}</AdminShell>
}
