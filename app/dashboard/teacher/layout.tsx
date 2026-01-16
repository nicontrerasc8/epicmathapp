import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import TeacherShell from "./ui/TeacherShell"
import { requireInstitution } from "@/lib/institution"

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
    const institution = await requireInstitution()
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        console.warn("[Teacher Layout] No authenticated user:", userError?.message)
        redirect("/sign-in")
    }

    const { data: me, error: profileError } = await supabase
        .from("edu_profiles")
        .select("id, first_name, last_name, global_role, active")
        .eq("id", user.id)
        .maybeSingle()

    if (profileError) {
        console.error("[Teacher Layout] Profile lookup error:", profileError)
        redirect("/sign-in")
    }

    if (!me) {
        console.warn(`[Teacher Layout] Profile not found for user: ${user.id}`)
        redirect("/sign-in")
    }

    if (!me.active) {
        console.warn(`[Teacher Layout] Inactive profile: ${user.id}`)
        redirect("/dashboard")
    }

    // Teachers and admins can access teacher routes
    if (me.global_role !== "teacher" && me.global_role !== "admin") {
        console.warn(`[Teacher Layout] Invalid role for teacher access: ${me.global_role}`)
        redirect("/dashboard")
    }

    const { data: membership, error: membershipError } = await supabase
        .from("edu_institution_members")
        .select("id")
        .eq("profile_id", user.id)
        .eq("institution_id", institution.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle()

    if (membershipError) {
        console.error("[Teacher Layout] Membership lookup error:", membershipError)
        redirect("/sign-in")
    }

    if (!membership) {
        console.warn(`[Teacher Layout] No active membership for user ${user.id} in institution ${institution.id}`)
        redirect("/sign-in")
    }

    const userName = `${me.first_name || ''} ${me.last_name || ''}`.trim() || 'Usuario'

    return <TeacherShell userName={userName}>{children}</TeacherShell>
}
